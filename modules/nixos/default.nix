{config, ...}: let
  user = config.flake.me;
  contents = builtins.readDir ./.;
  directories = builtins.filter (name: contents.${name} == "directory") (builtins.attrNames contents);
  modules = builtins.listToAttrs (builtins.map (name: {
      name = name;
      value = import ./${name};
    })
    directories);
  modulesWithDefault =
    modules
    // {
      default = {config, ...}: {
        # Enable flakes and nix commands
        nix.settings.experimental-features = ["nix-command" "flakes"];
        # NixOS version
        system.stateVersion = "26.05";
        # Default user
        users = {
          users.${user.username} = {
            isNormalUser = true;
            description = user.name;
            createHome = true;
            home = "/home/${user.username}";
            extraGroups = ["wheel"];
            openssh.authorizedKeys.keys = builtins.map (key: "${key} ${user.username}@${config.networking.hostName}") user.authorizedKeys;
          };
        };
        imports = builtins.attrValues modules;
      };
    };
in {
  flake.nixosModules = modulesWithDefault;
}
