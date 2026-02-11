{
  pkgs,
  config,
  lib,
  ...
}: {
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
      alejandra
      mmv
      gitleaks
      btop
      # Nix LSP
      nixd
      nil
      # Just LSP
      just-lsp
    ];
  };
}
