{ lib
, config
, inputs
, pkgs
, ...
}:
let
  isDarwin = lib.strings.hasSuffix "darwin" pkgs.system;
  isLinux = lib.strings.hasSuffix "linux" pkgs.system;
  caskName = "visual-studio-code";
  pkg =
    if isDarwin
    then inputs.nix-casks.packages.${pkgs.system}.${caskName}
    else pkgs.vscode;
in
{
  options.vscode.enable = lib.mkEnableOption "Visual Studio Code";
  config = lib.mkIf config.vscode.enable {
    home = {
      packages = [ pkg ];
      sessionVariables.EDITOR = "code --wait";
    };
    programs.vscode = lib.mkIf isLinux {
      package = pkg;
      enable = true;
      enableUpdateCheck = true;
    };
    stylix.targets.vscode.enable = false;
  };
}
