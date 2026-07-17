{
  flake.overlays.netbird-app = final: prev:
    prev.lib.optionalAttrs prev.stdenv.hostPlatform.isDarwin {
      netbird-app = final.stdenvNoCC.mkDerivation rec {
        pname = "netbird-app";
        version = "0.74.6";

        src = final.fetchurl {
          url = "https://github.com/netbirdio/netbird/releases/download/v${version}/netbird_${version}_darwin.pkg";
          hash = "sha256-cm2LcjD4Ob30T6KT5q1HGO5QZYkyoRENXkultBwiWfk=";
        };

        nativeBuildInputs = with final; [
          xar
          cpio
          gzip
        ];

        unpackPhase = ''
          runHook preUnpack
          xar -xf $src
          zcat netbird.pkg/Payload | cpio -id
          runHook postUnpack
        '';

        installPhase = ''
          runHook preInstall
          mkdir -p $out/Applications $out/bin
          cp -R Applications/NetBird.app $out/Applications/
          ln -s ../Applications/NetBird.app/Contents/MacOS/netbird $out/bin/netbird
          ln -s ../Applications/NetBird.app/Contents/MacOS/netbird-ui $out/bin/netbird-ui
          runHook postInstall
        '';

        meta = {
          description = "NetBird WireGuard mesh VPN client (official Darwin package)";
          homepage = "https://netbird.io";
          license = final.lib.licenses.bsd3;
          mainProgram = "netbird";
          platforms = final.lib.platforms.darwin;
          sourceProvenance = with final.lib.sourceTypes; [binaryNativeCode];
        };
      };
    };

  perSystem = {
    pkgs,
    lib,
    ...
  }: {
    packages = lib.optionalAttrs pkgs.stdenv.hostPlatform.isDarwin {
      netbird-app = pkgs.netbird-app;
    };
  };
}
