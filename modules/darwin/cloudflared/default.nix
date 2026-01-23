{
  config,
  pkgs,
  lib,
  user,
  ...
}: let
  inherit
    (lib)
    mkIf
    getExe
    mkEnableOption
    mkOption
    mkPackageOption
    ;
  inherit (lib.types) path;
  cfg = config.services.cloudflared;
in {
  options = {
    services.cloudflared = {
      enable = mkEnableOption "Cloudflare Tunnel";
      package = mkPackageOption pkgs "cloudflared" {};
      tokenFile = mkOption {
        type = path;
        default = "/Users/${user.username}/.local/share/cloudflared/token";
        defaultText = "/Users/\${user.username}/.local/share/cloudflared/token";
        description = ''
          Path to file containing the Cloudflare tunnel token.
          This file should contain only the token string and be readable only by the user.
          The token can be obtained from Cloudflare Zero Trust dashboard or via Terraform.
        '';
      };
      logDir = mkOption {
        type = path;
        default = "/Users/${user.username}/Library/Logs/cloudflared";
        defaultText = "/Users/\${user.username}/Library/Logs/cloudflared";
        description = ''
          Directory where the cloudflared logs will be stored.
        '';
      };
    };
  };
  config = mkIf cfg.enable {
    system.activationScripts.postActivation.text = ''
      echo "Creating Cloudflare Tunnel directories..."
      mkdir -p '${cfg.logDir}' && chown -R '${user.username}' '${cfg.logDir}'
    '';
    launchd.user.agents.cloudflared = {
      serviceConfig = {
        Label = "com.cloudflare.cloudflared";
        ProgramArguments = [
          "${getExe cfg.package}"
          "tunnel"
          "run"
          "--token-file"
          "${cfg.tokenFile}"
        ];
        WorkingDirectory = "/Users/${user.username}";
        RunAtLoad = true;
        KeepAlive = {
          SuccessfulExit = false;
          Crashed = true;
        };
        StandardOutPath = "${cfg.logDir}/launchd-stdout.log";
        StandardErrorPath = "${cfg.logDir}/launchd-stderr.log";
        ProcessType = "Background";
        ThrottleInterval = 15;
      };
    };
    environment.systemPackages = [cfg.package];
  };
}
