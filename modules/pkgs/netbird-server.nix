{
  flake.overlays.netbird-server = final: _prev: {
    netbird-server = final.buildGoModule rec {
      pname = "netbird-server";
      version = "0.74.4";

      src = final.fetchFromGitHub {
        owner = "netbirdio";
        repo = "netbird";
        tag = "v${version}";
        hash = "sha256-3V9w5/5mhoFHUt4W2epMJeL2O56W9wpbbJd/Edq73HA=";
      };

      vendorHash = "sha256-z/2+LUBocWQ06EfdJ4nujr4vb1e2zjmlufsGgGWN0ak=";

      subPackages = ["combined"];

      ldflags = [
        "-s"
        "-w"
        "-X github.com/netbirdio/netbird/version.version=v${version}"
        "-X main.builtBy=nix"
      ];

      # SQLite (mattn/go-sqlite3) needs CGO, matching upstream Docker builds.
      env.CGO_ENABLED = "1";

      doCheck = false;

      postInstall = ''
        mv $out/bin/combined $out/bin/netbird-server
      '';

      meta = {
        description = "Combined NetBird management, signal, relay, and STUN server";
        homepage = "https://netbird.io";
        license = final.lib.licenses.agpl3Only;
        mainProgram = "netbird-server";
      };
    };
  };

  perSystem = {pkgs, ...}: {
    packages.netbird-server = pkgs.netbird-server;
  };
}
