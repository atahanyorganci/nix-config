{
  flake.modules.nixos.netbird = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.netbird;
  in {
    options.netbird = {
      enable = lib.mkEnableOption "NetBird client (connect to self-hosted management)";
      managementUrl = lib.mkOption {
        type = lib.types.str;
        default = "https://netbird.yorganci.dev";
        description = "NetBird management service URL.";
      };
      setupKeyFile = lib.mkOption {
        type = lib.types.nullOr lib.types.str;
        default = null;
        example = "/var/lib/netbird-client/setup.key";
        description = ''
          Path to a setup key file for unattended login.
          Keep this outside the Nix store (e.g. under /var/lib).
        '';
      };
      package = lib.mkOption {
        type = lib.types.package;
        default = pkgs.netbird;
        defaultText = lib.literalExpression "pkgs.netbird";
        description = "NetBird client package (from flake overlay).";
      };
    };
    config = lib.mkIf cfg.enable {
      # NetBird DNS resolution uses systemd-resolved.
      services.resolved.enable = true;
      services.netbird.package = cfg.package;
      services.netbird.clients.wt0 = {
        port = 51820;
        openFirewall = true;
        openInternalFirewall = true;
        environment = {
          NB_MANAGEMENT_URL = cfg.managementUrl;
          NB_ADMIN_URL = cfg.managementUrl;
        };
        login = lib.mkIf (cfg.setupKeyFile != null) {
          enable = true;
          setupKeyFile = cfg.setupKeyFile;
        };
      };
      # Skip login (don't fail activation) until the setup key file exists.
      systemd.services.netbird-wt0-login = lib.mkIf (cfg.setupKeyFile != null) {
        unitConfig.ConditionPathExists = cfg.setupKeyFile;
      };
    };
  };
}
