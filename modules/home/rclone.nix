{lib, ...}: let
  remotes = {
    gphotos = {
      config.type = "google photos";
      secrets = ["client_id" "client_secret" "token"];
    };
  };
  secretName = remote: option: "rclone/${remote}/${builtins.replaceStrings ["_"] ["-"] option}";
  # The host side, the same on nix-darwin and NixOS: decrypts each remote's
  # credentials from the host's secrets file (`hosts/<host>.yaml`, which must
  # hold them) and turns on the Home Manager module that reads them.
  systemModule = {
    config,
    user,
    ...
  }: {
    options.rclone.enable = lib.mkEnableOption "rclone and its remotes, with their credentials from the host's secrets";
    config = lib.mkIf config.rclone.enable {
      sops.secrets = lib.listToAttrs (lib.concatLists (lib.mapAttrsToList (remote: {secrets, ...}:
        map (option: lib.nameValuePair (secretName remote option) {owner = user.username;}) secrets)
      remotes));
      home-manager.users.${user.username}.rclone.enable = true;
    };
  };
in {
  flake.modules.darwin.rclone = systemModule;
  flake.modules.nixos.rclone = systemModule;
  flake.modules.homeManager.rclone = {
    config,
    osConfig,
    ...
  }: {
    options.rclone.enable = lib.mkEnableOption "rclone and its remotes; set by the host's `rclone.enable`, which provides their secrets";
    config = lib.mkIf config.rclone.enable {
      programs.rclone = {
        enable = true;
        remotes =
          lib.mapAttrs (remote: settings: {
            inherit (settings) config;
            secrets = lib.genAttrs settings.secrets (option: osConfig.sops.secrets.${secretName remote option}.path);
          })
          remotes;
      };
    };
  };
}
