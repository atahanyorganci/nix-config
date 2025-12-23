{
  pkgs,
  user,
  inputs,
  ...
}: let
  system = pkgs.stdenv.hostPlatform.system;
in {
  imports = [
    inputs.firefox-nix-darwin.darwinModules.home-manager
  ];
  home.packages = with inputs.nix-casks.packages.${system}; [
    raycast
    whatsapp
    iina
    calibre
    helium-browser
    cursor
    zed
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
  syncthing.enable = true;
  tools.enable = true;
  opencode.enable = true;
  vscode.enable = true;
  uutils.enable = true;
  wget.enable = true;
}
