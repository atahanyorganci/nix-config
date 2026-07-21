{
  flake.modules.darwin.arr-stack = {
    config,
    lib,
    user,
    ...
  }: let
    cfg = config.arr-stack;
    inherit
      (lib)
      mkEnableOption
      mkOption
      types
      mkIf
      ;
  in {
    options.arr-stack = {
      enable =
        mkEnableOption "Arr Stack"
        // {
          description = ''
            Enable Arr Stack services including:
            - Sonarr
            - Radarr
            - Prowlarr
            - Transmission
            - Jellyfin
          '';
        };
      domain = mkOption {
        type = types.str;
        description = "The domain name for the Arr Stack.";
        example = "yorganci.dev";
      };
      listenAddress = mkOption {
        type = types.str;
        default = "*";
        description = "Bind address for Sonarr/Radarr/Prowlarr (and Transmission RPC).";
      };
    };
    config = mkIf cfg.enable (let
      privateHttpService = port: {
        inherit port;
        expose = {
          enable = true;
          private = true;
        };
        auth = {type = "none";};
      };
      publicHttpService = port: {
        inherit port;
        expose = {
          enable = true;
          private = false;
        };
        auth = {type = "none";};
      };
    in {
      httpServices = {
        tv = privateHttpService config.services.sonarr.settings.port;
        film = privateHttpService config.services.radarr.settings.port;
        indexer = privateHttpService config.services.prowlarr.settings.port;
        watch = publicHttpService 8096;
        download = privateHttpService config.services.transmission.settings."rpc-port";
      };
      services = {
        sonarr = {
          enable = true;
          settings.bind-address = cfg.listenAddress;
        };
        radarr = {
          enable = true;
          settings.bind-address = cfg.listenAddress;
        };
        prowlarr = {
          enable = true;
          settings.bind-address = cfg.listenAddress;
        };
        transmission = {
          enable = true;
          settings = {
            rpc-bind-address =
              if cfg.listenAddress == "*"
              then "0.0.0.0"
              else cfg.listenAddress;
            rpc-whitelist-enabled = true;
            rpc-whitelist = "127.0.0.1,100.*.*.*";
            rpc-host-whitelist-enabled = true;
            rpc-host-whitelist = "download.${cfg.domain}";
          };
        };
        jellyfin = {
          enable = true;
          knownProxies = ["100.64.0.0/10"];
          oidc = {
            enable = true;
            secretFile = "/var/lib/jellyfin-oidc/client-secret";
            providerName = "netbird";
            endpoint = "https://netbird.${cfg.domain}/oauth2";
            clientId = "jellyfin";
            usernameClaim = "email";
            # Keep admin when signing in with NetBird email.
            canonicalUsername = user.email;
            canonicalUserId = "5A8A2446-9984-479D-BBBC-8D86EDFBA8D0";
          };
        };
      };
    });
  };
}
