{lib, ...}: let
  deployKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOjQEQWwP1aWkv4t/nzin3rRn7ueC7HWR+g9Tec1nwuS";
in {
  options.flake = {
    me = lib.mkOption {
      type = lib.types.submodule {
        options = {
          name = lib.mkOption {type = lib.types.str;};
          email = lib.mkOption {type = lib.types.str;};
          username = lib.mkOption {type = lib.types.str;};
          shell = lib.mkOption {type = lib.types.str;};
          key = lib.mkOption {type = lib.types.str;};
          deployKey = lib.mkOption {
            type = lib.types.str;
            description = ''
              SSH public key the infrastructure stack provisions servers with:
              the Hetzner SSH key, the AWS key pair and first-boot root access.
              Kept apart from `authorizedKeys` because changing it replaces
              servers (Saturn's key pair and user data are immutable), while
              login keys should be free to change.
            '';
          };
          authorizedKeys = lib.mkOption {
            type = lib.types.listOf lib.types.str;
          };
        };
      };
    };
    infra = lib.mkOption {
      type = lib.types.submodule {
        options = {
          domain = lib.mkOption {type = lib.types.str;};
          netbirdManagementDomain = lib.mkOption {type = lib.types.str;};
          mailDomain = lib.mkOption {
            type = lib.types.str;
            description = ''
              Domain the hosts' mail (Authelia's codes and links, Vaultwarden's
              notices) is sent from. The NetbirdServer stack verifies it with
              SES and publishes its DKIM, MAIL FROM and DMARC records. A
              subdomain, so the apex stays free for a mailbox.
            '';
          };
          axiom.dataset = lib.mkOption {
            type = lib.types.strMatching "[A-Za-z0-9-]{1,128}";
            description = ''
              Axiom dataset holding the OpenTelemetry logs and traces of every
              host's `otel-collector`. One `axiom:events:v1` dataset for both
              signals: the Personal plan allows three datasets. The HomeInfra
              stack creates it; hosts route to it by name.
            '';
          };
        };
      };
    };
  };
  config.flake.me = {
    name = "Atahan Yorgancı";
    email = "atahanyorganci@hotmail.com";
    username = "atahan";
    shell = "fish";
    key = "277004B9D6B7DCE3";
    inherit deployKey;
    authorizedKeys = [deployKey];
  };
  config.flake.infra = rec {
    domain = "yorganci.dev";
    netbirdManagementDomain = "netbird.${domain}";
    mailDomain = "mail.${domain}";
    axiom.dataset = "otel";
  };
}
