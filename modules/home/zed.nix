{
  flake.modules.homeManager.zed = {
    lib,
    config,
    inputs,
    pkgs,
    ...
  }: let
    system = pkgs.stdenv.hostPlatform.system;
    package =
      if pkgs.stdenv.isDarwin
      then inputs.nix-casks.packages.${system}.zed
      else pkgs.zed;
  in {
    options.zed.enable = lib.mkEnableOption "Zed";
    config = lib.mkIf config.zed.enable {
      programs.zed-editor = {
        enable = true;
        inherit package;
        extensions = [
          "nix"
        ];
        userSettings = {
          auto_update = false;
          agent_servers = {
            cursor = {
              type = "registry";
            };
          };
          languages = {
            Nix = {
              # Disalbe auto formatting because `alejandra` isn't supported.
              format_on_save = false;
              formatter = null;
              indent_guides = {
                coloring = "fixed";
              };
              tab_size = 2;
            };
          };
          auto_install_extensions = {
            nix = true;
          };
          project_panel = {
            dock = "left";
          };
        };
      };
      stylix.targets.zed = {
        fonts = {
          override = {
            sizes = {
              applications = 10.5;
              terminal = 10.5;
            };
            sansSerif.name = "Cascadia Code NF";
            monospace.name = "Cascadia Code NF";
          };
        };
      };
    };
  };
}
