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
          admin = lib.mkOption {
            type = lib.types.submodule {
              options = {
                name = lib.mkOption {
                  type = lib.types.str;
                  description = "Username of the stack's admin: LLDAP's admin user, and NetBird's owner's display name.";
                };
                email = lib.mkOption {
                  type = lib.types.str;
                  description = ''
                    The admin's login wherever one has to look like an email:
                    NetBird's local users sign in with it, and LLDAP requires
                    one. Nothing is ever mailed to it.
                  '';
                };
                passwordSecret = lib.mkOption {
                  type = lib.types.str;
                  description = ''
                    Key of the admin's password in the nix-secrets file of the
                    host running LLDAP and the NetBird server, `/`-separated like
                    a sops-nix secret name. LLDAP re-applies it at every start;
                    the NetbirdServer stack sets NetBird's owner up with it
                    once. 8 to 72 characters: NetBird's limits.
                  '';
                };
              };
            };
            description = ''
              The account that owns the stack: NetBird's owner, a local user
              that signs in only with `netbird-server.bootstrap` on, and LLDAP's
              built-in admin, with one password. Authelia has no owner; people
              use their own LLDAP accounts.
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
    admin = {
      name = "admin";
      email = "admin@${domain}";
      passwordSecret = "admin/password";
    };
    axiom.dataset = "otel";
  };
}
