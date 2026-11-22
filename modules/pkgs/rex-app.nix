{
  # Rex.app: the macOS client for Rex. It is not on Homebrew (so not in
  # nix-casks) and not in the release API the `rex` flake uses; it ships via
  # Sparkle, whose appcast lists versioned DMGs that stay published:
  #
  #   https://blob.superlogical.com/public/rex-app/preview-arm64/appcast.xml
  #
  # To bump, take the newest <item>'s enclosure URL; `version` is
  # `<sparkle:shortVersionString>-<sparkle:version>`. Sparkle's own updates are
  # disabled in `modules/home/rex` so the app stays at this pin.
  #
  # Kept apart from `pkgs.rex` (the CLI from the upstream flake): the app is
  # released on its own cadence and embeds its own server binary
  # (`Contents/Helpers/Rex Server.rex`), which it installs under
  # `~/Library/Application Support/com.superlogical.rex` at runtime.
  flake.overlays.rex-app = final: prev:
    prev.lib.optionalAttrs (
      prev.stdenv.hostPlatform.isDarwin && prev.stdenv.hostPlatform.isAarch64
    ) {
      rex-app = final.stdenvNoCC.mkDerivation (finalAttrs: {
        pname = "rex-app";
        version = "0.1.0-2061";

        src = final.fetchurl {
          url = "https://blob.superlogical.com/public/rex-app/preview-arm64/Rex-${finalAttrs.version}.dmg";
          hash = "sha256-CYl5gf2Uq1f2RLDTYWPJUe+MtLa/AYCR7wan7kJGVsw=";
        };

        # The DMG is HFS+, so undmg handles it (no hdiutil needed).
        nativeBuildInputs = [final.undmg];
        sourceRoot = "Rex.app";

        dontConfigure = true;
        dontBuild = true;
        # Keep the signed bundle byte-for-byte; any change breaks the signature.
        dontFixup = true;

        installPhase = ''
          runHook preInstall
          mkdir -p $out/Applications/Rex.app
          cp -R . $out/Applications/Rex.app
          runHook postInstall
        '';

        meta = {
          description = "Rex, the multiplexer for all work (macOS app, preview channel)";
          homepage = "https://superlogical.com";
          license = final.lib.licenses.unfree;
          platforms = ["aarch64-darwin"];
          sourceProvenance = with final.lib.sourceTypes; [binaryNativeCode];
        };
      });
    };

  perSystem = {
    pkgs,
    lib,
    ...
  }: {
    packages =
      lib.optionalAttrs (
        pkgs.stdenv.hostPlatform.isDarwin && pkgs.stdenv.hostPlatform.isAarch64
      ) {
        rex-app = pkgs.rex-app;
      };
  };
}
