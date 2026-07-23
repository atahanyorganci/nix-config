{
  flake.overlays.netbird-proxy = final: _prev: {
    netbird-proxy = final.buildGoModule rec {
      pname = "netbird-proxy";
      version = "0.75.0";

      src = final.fetchFromGitHub {
        owner = "netbirdio";
        repo = "netbird";
        tag = "v${version}";
        hash = "sha256-1nFpeOWkWZIajjQU1jlSjQoxq+lyvR+rlsAxSV0vJZc=";
      };

      # Share the go-modules derivation name across NetBird components.
      overrideModAttrs = _final: _prev: {
        name = "netbird-${version}-go-modules";
      };

      vendorHash = "sha256-KVGCV89qGHrg2GQVw6MnftQswbdihcqozptjf5vs5BA=";

      proxyVendor = true;

      subPackages = ["proxy/cmd/proxy"];

      ldflags = [
        "-s"
        "-w"
        "-X github.com/netbirdio/netbird/version.version=v${version}"
        "-X main.builtBy=nix"
      ];

      env.CGO_ENABLED = "0";

      doCheck = false;

      postInstall = ''
        mv $out/bin/proxy $out/bin/netbird-proxy
      '';

      meta = {
        description = "NetBird reverse proxy for exposing mesh services publicly";
        homepage = "https://netbird.io";
        license = final.lib.licenses.bsd3;
        mainProgram = "netbird-proxy";
      };
    };
  };

  perSystem = {pkgs, ...}: {
    packages.netbird-proxy = pkgs.netbird-proxy;
  };
}
