{
  user,
  inputs,
  pkgs,
  ...
}: let
  brightness = inputs.brightness.packages.${pkgs.stdenv.hostPlatform.system}.default;
  responsively = inputs.nix-casks.packages.${pkgs.stdenv.hostPlatform.system}.responsively;
in {
  home.packages = [
    brightness
    responsively
  ];
  ffmpeg.enable = true;
  ghostty.enable = true;
  git = {
    enable = true;
    aliases.enable = true;
    user = {
      inherit (user) name email key;
    };
  };
  gum.enable = true;
  python.enable = true;
  shell = {
    bash.enable = true;
    fish.enable = true;
    zsh.enable = true;
  };
  tools.enable = true;
  opencode.enable = true;
  vscode.enable = true;
  uutils.enable = true;
  wget.enable = true;
}
