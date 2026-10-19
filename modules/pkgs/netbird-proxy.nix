{
  flake.overlays.netbird-proxy = final: _prev: {
    netbird-proxy = final.buildGoModule rec {
      pname = "netbird-proxy";
      version = "0.80.0";

      src = final.fetchFromGitHub {
        owner = "netbirdio";
        repo = "netbird";
        tag = "v${version}";
        hash = "sha256-oZgDYmNzf8UESUEbwn0Br0CaPTNLaEpuiKR2wW5zeGw=";
      };

      # Share the go-modules derivation name across NetBird components.
      overrideModAttrs = _final: _prev: {
        name = "netbird-${version}-go-modules";
      };

      vendorHash = "sha256-2lM0KtyU3RxA7KJtM10JslMpyHmgqxQ23B1Ieq986Y8=";

      # Forward backend cookies verbatim. Upstream reparses the Cookie header
      # to drop its own `nb_session`, and net/http silently discards values
      # that are not RFC 6265 tokens, such as the quoted, `\073`-escaped ones
      # Python writes (Hermes's PKCE state cookie never reached the callback).
      patches = [../../patches/netbird/proxy-preserve-cookies.patch];

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
