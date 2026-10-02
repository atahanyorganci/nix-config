{...}: let
  stylix = {
    config,
    options,
    lib,
    pkgs,
    ...
  }: let
    monospace = pkgs.cascadia-code;
  in {
    # Headless hosts have nothing to theme, so neither Stylix nor its font.
    fonts.packages = lib.mkIf (!config.headless) [monospace];

    # A disabled Stylix stops importing its Home Manager module, yet the shared
    # home modules still set `stylix.targets.*` and read `stylix.polarity`.
    # Import it here, switched off, so those options exist and do nothing.
    # Overlays stay off as Stylix itself does under `useGlobalPkgs`.
    home-manager = lib.optionalAttrs (options ? home-manager) {
      sharedModules = lib.mkIf config.headless [
        config.stylix.homeManagerIntegration.module
        {
          stylix.enable = false;
          stylix.overlays.enable = false;
        }
      ];
    };

    stylix = {
      enable = !config.headless;
      polarity = "dark";
      base16Scheme = ./cursor-dark.yaml;
      fonts = {
        monospace = {
          package = monospace;
          name = "Cascadia Code NF";
        };
      };
    };
  };
in {
  flake.modules.nixos.stylix = stylix;
  flake.modules.darwin.stylix = stylix;
}
