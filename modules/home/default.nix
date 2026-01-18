{ ... }:
let
  contents = builtins.readDir ./.;
  directories = builtins.filter (name: contents.${name} == "directory") (builtins.attrNames contents);
  modules = builtins.listToAttrs (builtins.map (name: { name = name; value = import ./${name}; }) directories);
  modulesWithDefault = modules // {
    default = { ... }: {
      # Compatibility with NixOS
      home.stateVersion = "24.05";
      # Let Home Manager install and manage itself.
      programs.home-manager.enable = true;
      # Setup XDG directories and environment variables
      xdg.enable = true;
      imports = builtins.attrValues modules;
    };
  };
in
{
  flake.homeModules = modulesWithDefault;
}
