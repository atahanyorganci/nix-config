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
    mapAttrs'
    nameValuePair
    concatMapStringsSep
    escapeShellArg
    ;
  inherit (lib.types) path attrsOf submodule;
  cfg = config.services.cloudflared;
  logDirSetupScript =
    concatMapStringsSep "\n" (
      tunnel: ''
        mkdir -p ${escapeShellArg (toString tunnel.logDir)} && chown -R ${escapeShellArg user.username} ${escapeShellArg (toString tunnel.logDir)}
      ''
    )
    (builtins.attrValues cfg.tunnels);
in {
  options = {
    services.cloudflared = {
      enable = mkEnableOption "Cloudflare Tunnel";
      package = mkPackageOption pkgs "cloudflared" {};
      tunnels = mkOption {
        type = attrsOf (submodule ({name, ...}: {
          options = {
            tokenFile = mkOption {
              type = path;
              description = ''
                Path to file containing the Cloudflare tunnel token.
                This file should contain only the token string and be readable only by the user.
                The token can be obtained from Cloudflare Zero Trust dashboard or via Terraform.
              '';
            };
            logDir = mkOption {
              type = path;
              default = "/Users/${user.username}/Library/Logs/cloudflared/${name}";
              defaultText = "/Users/\${user.username}/Library/Logs/cloudflared/\${name}";
              description = ''
                Directory where the cloudflared logs for this tunnel will be stored.
              '';
            };
          };
        }));
        default = {};
        description = ''
          Cloudflare tunnel definitions keyed by tunnel name.
        '';
        example = {
          arr = {
            tokenFile = "/Users/${user.username}/.local/share/cloudflared/arr.token";
            logDir = "/Users/${user.username}/Library/Logs/cloudflared/arr";
          };
          media = {
            tokenFile = "/Users/${user.username}/.local/share/cloudflared/media.token";
          };
        };
      };
    };
  };

  config = mkIf cfg.enable {
    system.activationScripts.postActivation.text = ''
      echo "Creating Cloudflare Tunnel directories..."
      ${logDirSetupScript}
    '';

    launchd.user.agents =
      mapAttrs' (
        name: tunnel:
          nameValuePair "cloudflared-${name}" {
            serviceConfig = {
              Label = "com.cloudflare.cloudflared.${name}";
              ProgramArguments = [
                "${getExe cfg.package}"
                "tunnel"
                "run"
                "--token-file"
                "${tunnel.tokenFile}"
              ];
              WorkingDirectory = "/Users/${user.username}";
              RunAtLoad = true;
              KeepAlive = {
                SuccessfulExit = false;
                Crashed = true;
              };
              StandardOutPath = "${tunnel.logDir}/launchd-stdout.log";
              StandardErrorPath = "${tunnel.logDir}/launchd-stderr.log";
              ProcessType = "Background";
              ThrottleInterval = 15;
            };
          }
      )
      cfg.tunnels;

    environment.systemPackages = [cfg.package];
  };
}
