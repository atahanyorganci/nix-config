{
  lib,
  config,
  inputs,
  pkgs,
  ...
}: let
  system = pkgs.stdenv.hostPlatform.system;
  pkg =
    if pkgs.stdenv.isDarwin
    then inputs.nix-casks.packages.${system}.visual-studio-code
    else pkgs.vscode;
in {
  options.vscode.enable = lib.mkEnableOption "Visual Studio Code";
  config = lib.mkIf config.vscode.enable {
    home = {
      packages = [pkg];
      sessionVariables.EDITOR = "code --wait";
    };
    programs.vscode = lib.mkIf pkgs.stdenv.isLinux {
      package = pkg;
      enable = true;
      enableUpdateCheck = true;
    };
    stylix.targets.vscode.enable = false;
  };
}
