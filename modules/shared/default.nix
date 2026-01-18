{ ... }:
let
  contents = builtins.readDir ./.;
  directories = builtins.filter (name: contents.${name} == "directory") (builtins.attrNames contents);
  modules = builtins.listToAttrs (builtins.map (name: { name = name; value = import ./${name}; }) directories);
  modulesWithDefault = modules // {
    shared = { ... }: {
      imports = builtins.attrValues modules;
    };
  };
in
{
  flake.darwinModules = modulesWithDefault;
  flake.nixosModules = modulesWithDefault;
}
