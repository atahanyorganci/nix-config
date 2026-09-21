is-clean:
    @git diff --exit-code --quiet || (echo "Uncommitted changes in repository" && exit 1)

update *args: is-clean
    nix flake update {{args}}
    git add flake.lock
    git commit -m "chore: update flake.lock"

# Root of the pi package the Nix options are generated from. Taken from the
# flake so the options always match the pi that actually gets installed.
pi_expr := "let f = builtins.getFlake (toString ./.); p = import f.inputs.nixpkgs { system = builtins.currentSystem; }; in p.pi-coding-agent"
pi_out := "modules/home/pi/generated"

# Regenerate the programs.pi option declarations from pi's type definitions.
pi-options *args:
    #!/usr/bin/env bash
    set -euo pipefail
    root="$(nix build --no-link --impure --print-out-paths --expr '{{pi_expr}}')/lib/node_modules/pi-monorepo"
    # Formatted with the repo's own Nix formatter so `nix fmt` leaves the
    # generated files alone and --check stays meaningful.
    alejandra="$(nix build --no-link --impure --print-out-paths --expr 'let f = builtins.getFlake (toString ./.); p = import f.inputs.nixpkgs { system = builtins.currentSystem; }; in p.alejandra')/bin/alejandra"
    # Node runs the generator's TypeScript directly (type stripping), so the
    # flake's own Node is used rather than whatever happens to be on PATH.
    node="$(nix build --no-link --impure --print-out-paths --expr 'let f = builtins.getFlake (toString ./.); p = import f.inputs.nixpkgs { system = builtins.currentSystem; }; in p.nodejs')/bin/node"
    "$node" packages/pi-nix-options/src/main.ts \
        --pi-root "$root" \
        --out-dir {{pi_out}} \
        --formatter "$alejandra -q -" \
        {{args}}

# Fail if the committed option declarations do not match the pinned pi.
pi-options-check: (pi-options "--check")

# Repoint the cobalt dependency at a newer upstream rev and reapply the patch.
#
# The patch exists because cobalt's async import cycles deadlock any bundler
# (see patches/). Upstream does not know about it, so a change to one of the
# five patched files makes it stop applying. Running this turns that into a
# visible conflict at a moment of choosing, rather than a service that quietly
# breaks the next time the lockfile is regenerated.
#
# Takes the new commit; with no argument it reapplies against the pinned one.
cobalt-sync rev="":
    #!/usr/bin/env bash
    set -euo pipefail
    current="$(grep -oE '[0-9a-f]{40}' pnpm-workspace.yaml | head -1)"
    rev="{{rev}}"
    rev="${rev:-$current}"
    if [ "$rev" != "$current" ]; then
        echo "cobalt: $current -> $rev"
        # The rev is embedded in the catalog specifier, so the edit is textual.
        sed -i.bak "s/$current/$rev/" pnpm-workspace.yaml && rm -f pnpm-workspace.yaml.bak
    fi
    # --force so the patched copy in the store is rebuilt from the new source
    # rather than reused; a stale copy would hide a conflict.
    if ! pnpm install --force; then
        echo
        echo "The patch no longer applies to $rev." >&2
        echo "Regenerate it: pnpm patch @imput/cobalt-api, edit, pnpm patch-commit <dir>." >&2
        exit 1
    fi
    # Applying cleanly is necessary but not sufficient: the point of the patch
    # is that the result bundles, so prove that rather than assume it.
    pnpm --filter @yorganci/pi-extension run build
    echo "Patch applies and the bundle still builds."
