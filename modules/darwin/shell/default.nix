{ pkgs, ... }:
let
  shells = with pkgs; [
    bashInteractive
    zsh
    fish
  ];
in
{
  environment.shells = shells;
  environment.systemPackages = shells;
  programs.bash.enable = true;
  programs.zsh.enable = true;
  programs.fish.enable = true;
}
