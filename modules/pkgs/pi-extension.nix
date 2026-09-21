{
  flake.overlays.yorganci-pi-extension = final: _prev: {
    # The workspace's pi extensions, bundled one directory per extension.
    #
    # Pi resolves nothing but the packages it injects, so each extension is
    # rolled up into a single file with its imports inlined. That also avoids
    # shipping a `node_modules` tree, whose symlinks point outside the store
    # and dangle once copied in.
    yorganci-pi-extension = let
      pname = "yorganci-pi-extension";
      version = "0.0.0";

      # `src` keeps more than `packages/pi-extension`: pnpm needs the lockfile
      # and `pnpm-workspace.yaml` (which holds the dependency catalog) at the
      # root, and the extension's tsconfig extends `@yorganci/config`.
      #
      # Every `workspace:*` dependency reachable from `@yorganci/pi-extension`
      # has to appear both here and in `pnpmWorkspaces` below. A package
      # missing from this fileset is not a configure-time error: pnpm installs
      # happily and the build only fails later, when rolldown cannot resolve
      # the import.
      src = final.lib.fileset.toSource {
        root = ../..;
        fileset = final.lib.fileset.unions [
          ../../pnpm-lock.yaml
          ../../pnpm-workspace.yaml
          ../../package.json
          ../../packages/config
          ../../packages/pi-extension

          # Stands in for cobalt's unpublished `@imput/version-info`. The
          # `workspace:^` specifier cannot resolve without a member of that
          # name, so this is required to install, not merely to build.
          ../../packages/imput-version-info
        ];
      };
    in
      final.stdenvNoCC.mkDerivation (finalAttrs: {
        inherit pname version src;

        nativeBuildInputs = [
          final.nodejs
          final.pnpm_11
          final.pnpm_11.configHook
        ];

        # Fetches the pnpm store as a fixed-output derivation. `pnpmWorkspaces`
        # restricts the install to the extension and its workspace
        # dependencies, so unrelated packages (stack, netbird-alchemy, ...)
        # stay out of the hash and do not trigger a refetch when they change.
        pnpmDeps = final.fetchPnpmDeps {
          inherit (finalAttrs) pname version src;
          fetcherVersion = 4;
          hash = "sha256-Lb39RIQOBzpvXO7cYg0G599TfY3lwETosA81ugWVVWQ=";
        };

        pnpmWorkspaces = [
          "@yorganci/config"
          "@yorganci/pi-extension"

          # Required by @imput/cobalt-api's `workspace:^` specifier. Omitting it
          # leaves the dependency unresolvable and fails the install.
          "@imput/version-info"
        ];

        buildPhase = ''
          runHook preBuild

          pnpm --filter @yorganci/pi-extension run build

          runHook postBuild
        '';

        installPhase = ''
          runHook preInstall

          mkdir -p "$out"
          cp -R packages/pi-extension/dist/. "$out/"

          runHook postInstall
        '';

        # The bundles cannot simply be imported here: they deliberately leave
        # pi's own packages external, and only pi supplies those at load time.
        # What can be checked is that nothing *else* stayed external, since an
        # unbundled dependency would fail the same way once pi loads the file.
        doInstallCheck = true;
        installCheckPhase = ''
          runHook preInstallCheck

          for bundle in "$out"/*/index.js; do
            node --check "$bundle"

            # Anchored to an import/export statement, and tolerant of the
            # space rolldown emits after `from`. Matching the bare `from"..."`
            # spelling alone finds nothing, and matching any quoted string
            # reports ordinary literals that merely follow the word `from`.
            leaked=$(
              grep -oE '(^|[;}])[[:space:]]*(import|export)[^;]*from ?"[^"]+"' "$bundle" \
                | grep -oE 'from ?"[^"]+"' \
                | sed -E 's/^from ?"|"$//g' \
                | grep -vE '^(@earendil-works/|typebox$|node:)' \
                || true
            )
            if [ -n "$leaked" ]; then
              echo "error: $bundle imports unbundled packages:" >&2
              echo "$leaked" >&2
              exit 1
            fi
          done

          runHook postInstallCheck
        '';

        meta = {
          description = "Pi coding agent extensions for this workspace";
          homepage = "https://github.com/atahanyorganci/nix-config";
          license = final.lib.licenses.mit;
          platforms = final.lib.platforms.unix;
        };
      });
  };

  perSystem = {pkgs, ...}: {
    packages.yorganci-pi-extension = pkgs.yorganci-pi-extension;
  };
}
