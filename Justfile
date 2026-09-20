is-clean:
    @git diff --exit-code --quiet || (echo "Uncommitted changes in repository" && exit 1)

update *args: is-clean
    nix flake update {{args}}
    git add flake.lock
    git commit -m "chore: update flake.lock"

# Root of the pi package the Nix options are generated from. Taken from the
# flake so the options always match the pi that actually gets installed.
pi_expr := "let f = builtins.getFlake (toString ./.); p = import f.inputs.nixpkgs { system = builtins.currentSystem; }; in p.pi-coding-agent"
pi_out := "modules/home/pi/_generated"

# Regenerate the programs.pi option declarations from pi's type definitions.
pi-options *args:
    #!/usr/bin/env bash
    set -euo pipefail
    root="$(nix build --no-link --impure --print-out-paths --expr '{{pi_expr}}')/lib/node_modules/pi-monorepo"
    bun packages/pi-nix-options/src/main.ts --pi-root "$root" --out-dir {{pi_out}} {{args}}

# Fail if the committed option declarations do not match the pinned pi.
pi-options-check: (pi-options "--check")
