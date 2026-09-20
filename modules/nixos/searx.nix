{
  flake.modules.nixos.searx = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.searx;
    stateDir = "/var/lib/searx";
    environmentFile = "${stateDir}/environment";
  in {
    options.searx = {
      enable = lib.mkEnableOption "private SearXNG search service";

      port = lib.mkOption {
        type = lib.types.port;
        default = 8888;
        description = "Port on which SearXNG listens.";
      };

      interface = lib.mkOption {
        type = lib.types.str;
        default = "nb-wt0";
        description = "Mesh interface on which the SearXNG port is reachable.";
      };
    };

    config = lib.mkIf cfg.enable {
      services.searx = {
        enable = true;
        environmentFile = environmentFile;
        settings = {
          server = {
            bind_address = "0.0.0.0";
            port = cfg.port;
            base_url = "https://search.yorganci.dev/";
            secret_key = "$SEARXNG_SECRET";
            limiter = false;
          };
          general.instance_name = "Search";
          search = {
            safe_search = 0;
            formats = ["html" "json"];
          };
        };
      };

      # SearXNG needs a signing key even though application-level auth is off.
      # Generate it locally so it never enters the Nix store.
      systemd.services.searx-secret = {
        description = "Generate the SearXNG signing key";
        requiredBy = ["searx-init.service"];
        before = ["searx-init.service"];
        serviceConfig = {
          Type = "oneshot";
          User = "searx";
          Group = "searx";
          StateDirectory = "searx";
          StateDirectoryMode = "0700";
        };
        script = ''
          set -eu
          if [ ! -s ${lib.escapeShellArg environmentFile} ]; then
            umask 077
            printf 'SEARXNG_SECRET=%s\n' "$(${pkgs.openssl}/bin/openssl rand -hex 32)" > ${lib.escapeShellArg environmentFile}
          fi
        '';
      };

      httpServices.search = {
        port = cfg.port;
        expose = {
          enable = true;
          private = true;
          accessGroups = ["Admin" "Users"];
        };
        auth = {type = "none";};
      };

      networking.firewall.interfaces.${cfg.interface}.allowedTCPPorts = [cfg.port];
    };
  };
}
