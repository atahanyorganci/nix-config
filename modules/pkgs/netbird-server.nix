{
  flake.overlays.netbird-server = final: _prev: {
    netbird-server = final.buildGoModule rec {
      pname = "netbird-server";
      version = "0.78.1";

      src = final.fetchFromGitHub {
        owner = "netbirdio";
        repo = "netbird";
        tag = "v${version}";
        hash = "sha256-YWLorAu71hG5BJLXsZwtQf86o51KCn2/1wI1DRg/aCg=";
      };

      vendorHash = "sha256-E8NeS88Ab5sumDxyH54y3GIWcXQQzRT0UXO+xwcQpUU=";

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
