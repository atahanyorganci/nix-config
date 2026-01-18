{ pkgs, config, lib, ... }:
{
  options.tools.enable = lib.mkEnableOption "miscellaneous tools";
  config = lib.mkIf config.tools.enable {
    home.packages = with pkgs; [
      just
      dust
      hyperfine
      tokei
      onefetch
      neofetch
      go-task
      pandoc
      qrencode
      scc
      nixpkgs-fmt
      mmv
      # Nix language server
      nixd
      nil
    ];
  };
}
