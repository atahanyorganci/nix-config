{
  withSystem,
  ...
}: {
  flake.modules.darwin.base = {config, ...}: {
    nixpkgs.pkgs = withSystem config.nixpkgs.system (
      {pkgs, ...}: pkgs
    );
  };
}
