#!/usr/bin/env python3
"""Generate `rex.settings` Home Manager options from the Rex.app binary.

Rex.app ships no settings schema, but its Swift reflection metadata describes
the settings store exactly: `RexMacOS.Settings` (and its siblings) are
`@Observable` classes holding an `NSUserDefaults`, with one backing field per
preference, e.g. `_tabStyle: RexMacOS.TabStyle`. This script joins three
sources taken from the pinned app, so the options cannot drift from it:

  1. Preference keys: `Workspace.*` string literals in `__TEXT,__cstring`.
  2. Value types: fields of every type that owns an `NSUserDefaults`, from
     `ipsw swift-dump --demangle`.
  3. Enum cases: `enum X { case ... }` blocks from the same dump. Raw values
     live in `__cstring` (case names live in `__swift5_reflstr`). An enum
     with implicit raw values has every case name there; one with explicit
     raw values does not, and its kebab-case or snake_case forms are there
     instead (`topLeft` is persisted as "top-left").

Usage (from the repository, with the pinned app and tools wired in):
  nix run .#rex-generate-options [-- --check]

Directly:
  generate-options.py --app Rex.app --out FILE
                      [--formatter 'alejandra -q -'] [--check]

`ipsw` must be on PATH (the flake package provides it).

`--check` regenerates in memory and exits 1 if FILE differs, so a bump of
`pkgs.rex-app` fails until the options are regenerated.
"""

from __future__ import annotations

import argparse
import plistlib
import re
import struct
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

REGENERATE_HINT = "nix run .#rex-generate-options"
KEY_PREFIX = "Workspace."

# Keys the app writes itself while running. Pinning them would fight the app
# (window restoration, focus history, dismissed notices), so they are never
# exposed as options.
RUNTIME_STATE = {
    "customThemes": "imported themes, written by Settings > Themes > Import",
    "hasDismissedRaisedTextContrastNotice": "one-time notice bookkeeping",
    "lastFocusedSession": "focus restoration",
    "mutedTabs": "per-tab state keyed by runtime tab IDs",
    "openWindows": "window restoration",
    "programActivitySeen": "notification bookkeeping",
    "sessionOrder": "sidebar ordering of runtime session IDs",
    "sidebarShownHostIDs": "runtime host IDs",
}

# Keys whose backing field is named differently and cannot be derived by the
# prefix rules in `normalize_field`.
FIELD_ALIASES = {
    "balancesSplitsOnCreation": "autobalancesSplits",
}

# Backing-field prefixes the app uses for computed wrappers around a stored
# value (`_storedInterfaceStyle` backs `interfaceStyle`).
FIELD_PREFIXES = ("stored", "persisted", "is")

# Swift scalar types and the Nix type that `defaults` can round-trip for them.
SCALARS = {
    "Swift.Bool": "bool",
    "Bool": "bool",
    "Double": "float",
    "Float": "float",
    "nominal type descriptor for CGFloat": "float",
    "Int": "int",
    "nominal type descriptor for UInt64": "int",
    "String": "str",
}


# --------------------------------------------------------------------------
# Mach-O: read the C-string literals without depending on otool/strings.
# --------------------------------------------------------------------------

CPU_TYPE_ARM64 = 0x0100000C
LC_SEGMENT_64 = 0x19


def cstrings(binary: Path) -> set[str]:
    data = binary.read_bytes()
    base = 0
    magic = struct.unpack_from(">I", data, 0)[0]
    if magic == 0xCAFEBABE:  # universal binary: pick the arm64 slice
        (count,) = struct.unpack_from(">I", data, 4)
        for index in range(count):
            cputype, _, offset, _, _ = struct.unpack_from(">iiIII", data, 8 + index * 20)
            if cputype == CPU_TYPE_ARM64:
                base = offset
                break
        else:
            raise SystemExit(f"{binary}: no arm64 slice")
    magic, _, _, _, ncmds, _, _, _ = struct.unpack_from("<IiiIIIII", data, base)
    if magic != 0xFEEDFACF:
        raise SystemExit(f"{binary}: not a 64-bit Mach-O file")
    offset = base + 32
    for _ in range(ncmds):
        cmd, cmdsize = struct.unpack_from("<II", data, offset)
        if cmd == LC_SEGMENT_64:
            nsects = struct.unpack_from("<I", data, offset + 64)[0]
            for index in range(nsects):
                sect = offset + 72 + index * 80
                sectname = data[sect : sect + 16].rstrip(b"\0")
                segname = data[sect + 16 : sect + 32].rstrip(b"\0")
                if (segname, sectname) == (b"__TEXT", b"__cstring"):
                    size = struct.unpack_from("<Q", data, sect + 40)[0]
                    fileoff = struct.unpack_from("<I", data, sect + 48)[0]
                    raw = data[base + fileoff : base + fileoff + size]
                    return {s.decode("utf-8", "replace") for s in raw.split(b"\0") if s}
        offset += cmdsize
    raise SystemExit(f"{binary}: no __TEXT,__cstring section")


# --------------------------------------------------------------------------
# Swift metadata, as printed by `ipsw swift-dump --demangle`.
# --------------------------------------------------------------------------


@dataclass
class SwiftType:
    kind: str  # struct | class | enum
    name: str
    fields: dict[str, str] = field(default_factory=dict)
    # Enum cases: name -> associated payload type, or None for a bare case.
    cases: dict[str, str | None] = field(default_factory=dict)


TYPE_RE = re.compile(r"^(struct|class|enum) ([^\s{:]+)")
FIELD_RE = re.compile(r"^\s+(?:var|let) (\w+): (.+?)\s*$")
CASE_RE = re.compile(r"^\s+case (\w+)(?:: (.+?))?\s*$")


def parse_swift_dump(text: str) -> dict[str, SwiftType]:
    types: dict[str, SwiftType] = {}
    current: SwiftType | None = None
    for line in text.splitlines():
        if match := TYPE_RE.match(line):
            current = types.setdefault(match[2], SwiftType(match[1], match[2]))
        elif line.startswith("}"):
            current = None
        elif current is None:
            continue
        elif match := FIELD_RE.match(line):
            current.fields.setdefault(match[1], match[2])
        elif current.kind == "enum" and (match := CASE_RE.match(line)):
            current.cases.setdefault(match[1], match[2])
    return types


def normalize_field(name: str) -> str:
    name = name.lstrip("_")
    for prefix in FIELD_PREFIXES:
        rest = name[len(prefix) :]
        if name.startswith(prefix) and rest[:1].isupper():
            return rest[0].lower() + rest[1:]
    return name


def settings_fields(types: dict[str, SwiftType]) -> dict[str, tuple[str, str]]:
    """Normalized field name -> (Swift type, owning type), for defaults owners."""
    found: dict[str, tuple[str, str]] = {}
    for swift_type in types.values():
        if "NSUserDefaults" not in swift_type.fields.values():
            continue
        for name, type_name in swift_type.fields.items():
            found.setdefault(normalize_field(name), (type_name, swift_type.name))
    return found


# --------------------------------------------------------------------------
# Swift type -> Nix type.
# --------------------------------------------------------------------------


def kebab(name: str) -> str:
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"-\1", name).lower()


def snake(name: str) -> str:
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"_\1", name).lower()


def enum_values(enum: SwiftType, literals: set[str]) -> list[str]:
    cases = list(enum.cases)
    # Implicit raw values first: a kebab form can exist in `__cstring` for
    # unrelated reasons ("terminal-foreground" is also a design-token name).
    for transform in (str, kebab, snake):
        values = [transform(case) for case in cases]
        if all(value in literals for value in values):
            return values
    print(f"warning: {enum.name}: raw values not found, using case names", file=sys.stderr)
    return cases


@dataclass
class Resolved:
    nix: str | None  # rendered `types.*` expression, or None when unsupported
    swift: str
    reason: str = ""


def resolve(type_name: str, types: dict[str, SwiftType], literals: set[str]) -> Resolved:
    bare = re.sub(r"\s*\?$", "", type_name)
    if bare in SCALARS:
        return Resolved(f"types.{SCALARS[bare]}", type_name)
    if bare == "[String]":
        return Resolved("types.listOf types.str", type_name)
    swift_type = types.get(bare)
    if swift_type is None:
        return Resolved(None, type_name, "type not found in Swift metadata")
    if swift_type.kind != "enum":
        return Resolved(None, type_name, f"{swift_type.kind}, persisted in an encoded form")
    if not swift_type.cases:
        return Resolved(None, type_name, "enum without cases")
    if any(payload is not None for payload in swift_type.cases.values()):
        return Resolved(None, type_name, "enum with associated values")
    values = " ".join(nix_string(value) for value in enum_values(swift_type, literals))
    return Resolved(f"types.enum [{values}]", type_name)


# --------------------------------------------------------------------------
# Emit Nix.
# --------------------------------------------------------------------------


def nix_string(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("${", "\\${") + '"'


def nix_attr(name: str) -> str:
    return name if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_'-]*", name) else nix_string(name)


@dataclass
class Option:
    key: str  # full defaults key, e.g. Workspace.experiments.usesNewQuickSwitcher
    resolved: Resolved
    owner: str


def render_option(name: str, option: Option, depth: int) -> str:
    pad = "  " * depth
    nix = option.resolved.nix
    description = f"`{option.key}` (Swift `{option.resolved.swift}` in `{option.owner}`). Unset leaves Rex's built-in default."
    lines = [
        f"{pad}{nix_attr(name)} = mkOption {{",
        f"{pad}  type = types.nullOr ({nix});",
        f"{pad}  default = null;",
    ]
    if nix == "types.float":
        # `defaults` keeps ints and reals apart; the app reads these as Double,
        # so accept `12` from Nix and write it as `12.0`.
        lines[1] = f"{pad}  type = types.nullOr types.number;"
        lines.append(f"{pad}  apply = value: if value == null then null else value * 1.0;")
    lines.append(f"{pad}  description = {nix_string(description)};")
    lines.append(f"{pad}}};")
    return "\n".join(lines)


def render_tree(tree: dict, depth: int) -> str:
    out = []
    for name in sorted(tree, key=str.lower):
        node = tree[name]
        if isinstance(node, Option):
            out.append(render_option(name, node, depth))
            continue
        pad = "  " * depth
        out.append(
            f"{pad}{nix_attr(name)} = mkOption {{\n"
            f"{pad}  type = types.submodule {{\n"
            f"{pad}    options = {{\n{render_tree(node, depth + 3)}\n{pad}    }};\n"
            f"{pad}  }};\n"
            f"{pad}  default = {{}};\n"
            f"{pad}  description = {nix_string(f'Settings under `{KEY_PREFIX}{name}.`.')};\n"
            f"{pad}}};"
        )
    return "\n".join(out)


def emit(app_version: str, options: list[Option], skipped: list[tuple[str, str]]) -> str:
    tree: dict = {}
    for option in options:
        node = tree
        *parents, leaf = option.key[len(KEY_PREFIX) :].split(".")
        for parent in parents:
            node = node.setdefault(parent, {})
        node[leaf] = option
    header = [
        "# Generated by modules/pkgs/rex-generate-options/generate-options.py — DO NOT EDIT BY HAND.",
        "#",
        f"# Source: Rex.app {app_version} (Swift metadata of Contents/MacOS/Rex)",
        f"# Regenerate: {REGENERATE_HINT}",
        "#",
        "# Every option is nullable and defaults to null; the module drops null",
        "# values so unset options stay absent from the defaults domain and Rex",
        "# applies its own default.",
        "#",
        "# Not exposed (use `rex.extraSettings` with the full key if needed):",
    ]
    header += [f"#   - {key}: {reason}" for key, reason in sorted(skipped, key=lambda item: item[0].lower())]
    body = render_tree(tree, 5)
    return (
        "\n".join(header)
        + "\n{\n  flake.modules.homeManager.rex = {lib, ...}: let\n    inherit (lib) mkOption types;\n  in {\n"
        + "    options.rex.settings = mkOption {\n      type = types.submodule {\n        options = {\n"
        + body
        + "\n        };\n      };\n      default = {};\n"
        + f"      description = {nix_string(f'Rex.app preferences, written to the `com.superlogical.rex` defaults domain under `{KEY_PREFIX}`.')};\n"
        + "    };\n  };\n}\n"
    )


# --------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--app", required=True, type=Path, help="path to Rex.app")
    parser.add_argument("--out", required=True, type=Path, help="generated Nix file")
    parser.add_argument("--formatter", help="command reading Nix on stdin and writing it to stdout")
    parser.add_argument("--check", action="store_true", help="fail if --out is out of date")
    args = parser.parse_args()

    binary = args.app / "Contents" / "MacOS" / "Rex"
    info = plistlib.loads((args.app / "Contents" / "Info.plist").read_bytes())
    app_version = f"{info['CFBundleShortVersionString']} ({info['CFBundleVersion']})"

    literals = cstrings(binary)
    keys = sorted(
        s for s in literals if re.fullmatch(r"Workspace(\.[a-z][A-Za-z0-9]*)+", s) and not s.endswith(".swift")
    )

    # ipsw prints a non-fatal precache warning for some newer descriptor kinds
    # on stderr; the dump on stdout is still complete. No `check=True`: output
    # is captured, so a raised CalledProcessError would hide ipsw's stderr.
    dump = subprocess.run(["ipsw", "swift-dump", "--demangle", str(binary)], capture_output=True, text=True)
    if dump.returncode != 0 or not dump.stdout:
        sys.stderr.write(dump.stderr)
        return dump.returncode or 1
    types = parse_swift_dump(dump.stdout)
    fields = settings_fields(types)

    options: list[Option] = []
    skipped: list[tuple[str, str]] = []
    for key in keys:
        short = key[len(KEY_PREFIX) :]
        leaf = short.rsplit(".", 1)[-1]
        if short in RUNTIME_STATE:
            skipped.append((key, f"runtime state ({RUNTIME_STATE[short]})"))
            continue
        entry = fields.get(FIELD_ALIASES.get(short, leaf))
        if entry is None:
            skipped.append((key, "no backing field in a defaults-owning type"))
            continue
        type_name, owner = entry
        resolved = resolve(type_name, types, literals)
        if resolved.nix is None:
            skipped.append((key, f"`{type_name}`: {resolved.reason}"))
            continue
        options.append(Option(key, resolved, owner))

    source = emit(app_version, options, skipped)
    if args.formatter:
        formatted = subprocess.run(args.formatter, input=source, capture_output=True, text=True, shell=True)
        if formatted.returncode != 0:
            raise SystemExit(f"formatter failed: {formatted.stderr}")
        source = formatted.stdout

    print(f"rex: {len(options)} options, {len(skipped)} skipped, from Rex.app {app_version}", file=sys.stderr)
    if args.check:
        current = args.out.read_text() if args.out.exists() else ""
        if current != source:
            print(f"{args.out} is out of date; run `{REGENERATE_HINT}`", file=sys.stderr)
            return 1
        return 0
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(source)
    return 0


if __name__ == "__main__":
    sys.exit(main())
