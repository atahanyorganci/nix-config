{
  flake.overlays."9router" = final: _prev: {
    "9router" = final.buildNpmPackage rec {
      pname = "9router";
      version = "0.5.35";

      src = final.fetchFromGitHub {
        owner = "decolua";
        repo = "9router";
        tag = "v${version}";
        hash = "sha256-KlVaZ47BU6RZpfzAW02K328RIkFxo8UPbAe3vCUHOXU=";
      };

      # Upstream ships no package-lock.json and the CLI (`cli/`) isn't wired up
      # as an npm workspace of the root Next.js dashboard, even though `npm run
      # cli:pack` builds the dashboard and bundles it into `cli/app` before
      # packing. Declare the workspace ourselves so `buildNpmPackage` can build
      # both trees from a single, reproducible lockfile.
      postPatch = ''
        ${final.jq}/bin/jq '. + {workspaces: ["cli"]}' package.json > package.json.tmp
        mv package.json.tmp package.json
        cp ${./package-lock.json} package-lock.json

        # next/font/google fetches Inter from Google Fonts at build time, which
        # needs network access that the build sandbox doesn't have. Tailwind's
        # own `--font-sans` stack (src/app/globals.css) already falls back to
        # -apple-system/system-ui/sans-serif when "Inter" isn't installed, so
        # drop the self-hosted webfont instead of vendoring it.
        substituteInPlace src/app/layout.js \
          --replace-fail 'import { Inter } from "next/font/google";' "" \
          --replace-fail \
            $'const inter = Inter({\n  subsets: ["latin"],\n  variable: "--font-inter",\n});' \
            'const inter = {variable: ""};'
      '';

      npmDepsHash = "sha256-Vj8sigFeKSWzBYJ4MPQrzPqpsyV0jhVaJt9Hk/wPZq4=";
      # Needed for npm workspaces support (see nixpkgs `buildNpmPackage` docs).
      npmDepsFetcherVersion = 2;

      npmWorkspace = "cli";
      # `cli`'s "build" script (scripts/build-cli.js) builds the root Next.js
      # dashboard, bundles the standalone output into `cli/app`, then builds
      # the MITM proxy server.
      npmBuildScript = "build";

      env.NEXT_TELEMETRY_DISABLED = "1";

      # npm workspaces self-link the `cli` package into the hoisted root
      # node_modules (`node_modules/9router -> ../cli`, plus its `.bin` entry).
      # The default `npmInstallHook` copies that node_modules wholesale into
      # the output without also nesting a copy of `cli/` under it, leaving
      # these two self-referential symlinks dangling. Nothing needs them.
      postInstall = ''
        cliOut="$out/lib/node_modules/$(${final.jq}/bin/jq --raw-output '.name' package.json)"
        rm -f "$cliOut/node_modules/9router" "$cliOut/node_modules/.bin/9router"
      '';

      meta = {
        description = "CLI to run a local AI router that fronts Claude Code, Codex, Cursor and other coding agents with 40+ providers";
        homepage = "https://9router.com";
        changelog = "https://github.com/decolua/9router/releases/tag/v${version}";
        license = final.lib.licenses.mit;
        mainProgram = "9router";
      };
    };
  };

  perSystem = {pkgs, ...}: {
    packages."9router" = pkgs."9router";
  };
}
