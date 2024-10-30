{ pkgs, user, ... }:
{
  imports = [
    ../../modules/home-manager
  ];
  home = {
    username = user.username;
    homeDirectory = "/home/${user.username}";
    packages = with pkgs; [ hello ];
  };
  alacritty.enable = true;
  ffmpeg.enable = true;
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
    fish = {
      enable = true;
      addInitExtra = true;
    };
  };
  tools.enable = true;
  wget.enable = true;
}
