{ pkgs, user, inputs, ... }:
{
  imports = [
    inputs.darwin-firefox.darwinModules.home-manager
    ../../modules/home-manager
  ];
  alacritty.enable = true;
  ffmpeg.enable = true;
  firefox.enable = true;
  git = {
    enable = true;
    aliases.enable = true;
    user = {
      inherit (user) name email key;
    };
  };
  gum.enable = true;
  kitty.enable = true;
  node.enable = true;
  python.enable = true;
  shell = {
    bash.enable = true;
    zsh.enable = true;
    fish.enable = true;
  };
  tools.enable = true;
  wget.enable = true;
}
