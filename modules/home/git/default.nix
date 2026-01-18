{ lib, ... }: {
  imports = [
    ./aliases.nix
    ./cli.nix
  ];
  options.git.enable = lib.mkEnableOption "git";
}
