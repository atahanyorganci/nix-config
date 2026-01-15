{ pkgs, user, inputs, ... }:
{
  imports = [
    inputs.firefox-nix-darwin.darwinModules.home-manager
    ../../modules/home-manager
  ];
  home.packages = with inputs.nix-casks.packages.${pkgs.system}; [
    raycast
    whatsapp
    iina
    calibre
    helium-browser
    cursor
    slack
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
