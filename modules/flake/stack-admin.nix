{
  config,
  lib,
  ...
}: let
  # The one NixOS host running the NetBird server, and with it LLDAP: its
  # nix-secrets file holds the admin's password.
  hosts = lib.filterAttrs (_: system: system.config.netbird-server.enable or false) config.flake.nixosConfigurations;
  host =
    if lib.length (lib.attrNames hosts) == 1
    then lib.head (lib.attrValues hosts)
    else throw "flake.stackAdmin: expected exactly one host with `netbird-server.enable`, found ${toString (lib.attrNames hosts)}";
in {
  options.flake.stackAdmin = lib.mkOption {
    type = lib.types.raw;
    description = ''
      The stack's admin (`infra.admin`) for the NetbirdServer stack, which sets
      NetBird's owner up as it: its name, login, and where its password is (the
      NetBird host's nix-secrets file at the locked revision, and the key in it).
    '';
  };

  config.flake.stackAdmin = {
    inherit (config.flake.infra.admin) name email passwordSecret;
    secretsFile =
      if host.options.sops.defaultSopsFile.isDefined
      then host.config.sops.defaultSopsFile
      else throw "flake.stackAdmin: ${host.config.networking.hostName} has no nix-secrets file";
  };
}
