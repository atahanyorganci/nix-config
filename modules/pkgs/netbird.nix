{
  flake.overlays.netbird = final: _prev: {
    netbird = final.buildGoModule rec {
      pname = "netbird";
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

      proxyVendor = true;

      nativeBuildInputs = [final.installShellFiles];

      subPackages = ["client"];

      ldflags = [
        "-s"
        "-w"
        "-X github.com/netbirdio/netbird/version.version=v${version}"
        "-X main.builtBy=nix"
      ];

      doCheck = false;

      postPatch = ''
        # Compatible with systemd RuntimeDirectory=netbird
        substituteInPlace client/cmd/root.go \
          --replace-fail 'unix:///var/run/netbird.sock' 'unix:///var/run/netbird/sock'
        substituteInPlace client/ui/grpc.go \
          --replace-fail 'unix:///var/run/netbird.sock' 'unix:///var/run/netbird/sock'
      '';

      postInstall =
        ''
          mv $out/bin/client $out/bin/netbird
        ''
        + final.lib.optionalString (final.stdenv.buildPlatform.canExecute final.stdenv.hostPlatform) ''
          installShellCompletion --cmd netbird \
            --bash <($out/bin/netbird completion bash) \
            --fish <($out/bin/netbird completion fish) \
            --zsh <($out/bin/netbird completion zsh)
        '';

      meta = {
        description = "NetBird WireGuard mesh VPN client";
        homepage = "https://netbird.io";
        license = final.lib.licenses.bsd3;
        mainProgram = "netbird";
      };
    };
  };

  perSystem = {pkgs, ...}: {
    packages.netbird = pkgs.netbird;
  };
}
