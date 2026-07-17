{...}: let
  module = {
    lib,
    config,
    user,
    ...
  }: {
    options.hostInventory = {
      role = lib.mkOption {
        type = lib.types.nullOr (lib.types.enum ["agentHolder" "managedTarget"]);
        default = null;
        description = "Flake inventory role; null excludes this host from inventory";
      };
      ssh = {
        hostNames = lib.mkOption {
          type = lib.types.listOf lib.types.str;
          default = let
            hostname = config.networking.hostName or "";
          in
            if hostname == "" || hostname == null
            then []
            else [hostname "${hostname}.netbird.selfhosted"];
          defaultText = lib.literalExpression ''[ hostname "''${hostname}.netbird.selfhosted" ]'';
          description = "SSH Host patterns for this machine";
        };
        uid = lib.mkOption {
          type = lib.types.nullOr lib.types.int;
          default = null;
          description = "Remote user UID for Linux GPG RemoteForward socket path";
        };
        user = lib.mkOption {
          type = lib.types.str;
          default = user.username;
          defaultText = lib.literalExpression "user.username";
          description = "SSH login user";
        };
      };
    };
  };
in {
  flake.modules.nixos.host-inventory = {lib, ...}: {
    imports = [module];
    # First normal user is typically UID 1000 when unset in the user module.
    config.hostInventory.ssh.uid = lib.mkDefault 1000;
  };
  flake.modules.darwin.host-inventory = module;
}
