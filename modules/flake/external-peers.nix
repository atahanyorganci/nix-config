{
  config,
  lib,
  ...
}: let
  inherit (lib) types mkOption;

  peer = {
    # The same `httpServices` and `meshServices` options a NixOS or Darwin host
    # declares, so the stack publishes and opens them alike.
    imports = [
      config.flake.modules.nixos.http-service
      config.flake.modules.nixos.mesh-service
    ];

    options.netbird = {
      group = mkOption {
        type = types.nullOr (types.enum ["Server" "Agent"]);
        default = null;
        description = ''
          Peer group the stack puts the peer in, as it does a host's
          `hostInventory.netbird.group`. Null leaves it in no group but All.
        '';
      };
      loginExpirationEnabled = mkOption {
        type = types.bool;
        default = false;
        description = "Require periodic NetBird re-authentication on this peer.";
      };
      inactivityExpirationEnabled = mkOption {
        type = types.bool;
        default = false;
        description = "Disconnect the peer after inactivity.";
      };
    };
  };
in {
  options.flake.externalPeers = mkOption {
    type = types.attrsOf (types.submodule peer);
    default = {};
    example = lib.literalExpression ''
      {
        nas = {
          netbird.group = "Server";
          httpServices.nas = {
            port = 5000;
            expose.enable = true;
          };
        };
      }
    '';
    description = ''
      NetBird peers this flake does not configure, such as appliances, by the
      hostname NetBird reports for them. They enroll by hand (a setup key from
      `create-setup-keys`); the HomeInfra stack then adopts each peer, puts it
      in its group, and publishes and opens its services like a host's.
    '';
  };
}
