{
  flake.overlays.omlx = final: prev:
    prev.lib.optionalAttrs (
      prev.stdenv.hostPlatform.isDarwin && prev.stdenv.hostPlatform.isAarch64
    ) {
      omlx = final.stdenvNoCC.mkDerivation (finalAttrs: {
        pname = "omlx";
        version = "0.5.1";

        src = final.fetchurl {
          url = "https://github.com/jundot/omlx/releases/download/v${finalAttrs.version}/oMLX-${finalAttrs.version}-macos26-27.dmg";
          hash = "sha256-CkSvyaJQcPfrWyjJeqP00gTrQGaZfJe06+deVKEepWE=";
        };

        sourceRoot = ".";

        dontPatch = true;
        dontConfigure = true;
        dontBuild = true;
        dontFixup = true;

        # undmg doesn't support APFS; keep xattrs intact (7zz can break them).
        # Same approach as nixpkgs lmstudio/insomnia Darwin packages.
        unpackCmd = ''
          mnt=$(TMPDIR=/tmp mktemp -d -t nix-XXXXXXXXXX)
          finish() {
            /usr/bin/hdiutil detach "$mnt" -force
            rm -rf "$mnt"
          }
          trap finish EXIT
          /usr/bin/hdiutil attach -nobrowse -mountpoint "$mnt" "$curSrc"
          cp -a "$mnt/oMLX.app" "$PWD/"
        '';

        installPhase = ''
          runHook preInstall
          mkdir -p $out/Applications $out/bin
          cp -R oMLX.app $out/Applications/
          # Store paths are read-only after install; make writable for codesign.
          chmod -R u+w $out/Applications/oMLX.app
          # Nix store copy invalidates the upstream signature; ad-hoc re-sign.
          /usr/bin/codesign --force --deep --sign - "$out/Applications/oMLX.app"
          ln -s ../Applications/oMLX.app/Contents/MacOS/omlx-cli $out/bin/omlx
          runHook postInstall
        '';

        meta = {
          description = "LLM inference server with continuous batching for Apple Silicon";
          homepage = "https://omlx.ai";
          changelog = "https://github.com/jundot/omlx/releases/tag/v${finalAttrs.version}";
          license = final.lib.licenses.asl20;
          mainProgram = "omlx";
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
        omlx = pkgs.omlx;
      };
  };
}
