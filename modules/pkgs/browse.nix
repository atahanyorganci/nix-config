{
  flake.overlays.browse = final: _prev: {
    # browse: an MCP server and Chromium extension that let agents drive the
    # real browser. Upstream ships the native binary per platform on npm
    # (`@opencode/browse-<platform>`); the `@opencode/browse` package is only a
    # Node launcher around it, so the binary is fetched directly. Linux uses
    # the musl builds, which are statically linked and need no patching.
    #
    # Run from the store, browse classifies its install as `other` and never
    # replaces itself; bump `version` and the hashes here instead.
    browse = let
      version = "0.1.5";
      platforms = {
        aarch64-darwin = {
          name = "darwin-arm64";
          hash = "sha256-1jsw2bidBQcKMxDS2AQ14Gq5zDUha4AazGj5aeFCAr8=";
        };
        x86_64-darwin = {
          name = "darwin-x64";
          hash = "sha256-/PiaQKnbNIYY7cqRT+hLooS0jH7PWCmeF0gFYHJjtYk=";
        };
        aarch64-linux = {
          name = "linux-arm64-musl";
          hash = "sha256-l/f5WijB0OirZCx4uNYQqxEtgFim+93zYFY2jXCrMyg=";
        };
        x86_64-linux = {
          name = "linux-x64-musl";
          hash = "sha256-R7NP2YkSwJco1The86pxL4b1/j3+6G6tOO1kWinZXRk=";
        };
      };
      system = final.stdenv.hostPlatform.system;
      platform = platforms.${system} or (throw "browse: unsupported system ${system}");
    in
      final.stdenvNoCC.mkDerivation {
        pname = "browse";
        inherit version;

        src = final.fetchurl {
          url = "https://registry.npmjs.org/@opencode/browse-${platform.name}/-/browse-${platform.name}-${version}.tgz";
          inherit (platform) hash;
        };

        sourceRoot = "package";

        dontConfigure = true;
        dontBuild = true;
        dontStrip = true;

        installPhase = ''
          runHook preInstall
          install -Dm755 bin/browse $out/bin/browse
          runHook postInstall
        '';

        meta = {
          description = "Let your AI agents use your real browser: an MCP server and a Chromium extension";
          homepage = "https://github.com/anomalyco/browse";
          license = final.lib.licenses.mit;
          mainProgram = "browse";
          platforms = builtins.attrNames platforms;
          sourceProvenance = with final.lib.sourceTypes; [binaryNativeCode];
        };
      };
  };

  perSystem = {pkgs, ...}: {
    packages.browse = pkgs.browse;
  };
}
