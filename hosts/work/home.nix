{ pkgs, user, inputs, ... }:
{
  imports = [
    inputs.firefox-darwin.darwinModules.home-manager
    ../../modules/home-manager
  ];
  home.packages = with inputs.nix-casks.packages.${pkgs.system}; [
    raycast
    discord
    whatsapp
    orbstack
  ];
  firefox.enable = true;
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
    zsh.enable = true;
    fish.enable = true;
  };
  tools.enable = true;
  vscode.enable = true;
  uutils.enable = true;
  wget.enable = true;
}
