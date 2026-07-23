{
  flake.overlays.netbird-server = final: _prev: {
    netbird-server = final.buildGoModule rec {
      pname = "netbird-server";
      version = "0.75.0";

      src = final.fetchFromGitHub {
        owner = "netbirdio";
        repo = "netbird";
        tag = "v${version}";
        hash = "sha256-1nFpeOWkWZIajjQU1jlSjQoxq+lyvR+rlsAxSV0vJZc=";
      };

      vendorHash = "sha256-KVGCV89qGHrg2GQVw6MnftQswbdihcqozptjf5vs5BA=";

      proxyVendor = true;

      # Share the go-modules derivation name across NetBird components.
      overrideModAttrs = _final: _prev: {
        name = "netbird-${version}-go-modules";
      };

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
