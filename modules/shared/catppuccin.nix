{inputs, ...}: let
  # Catppuccin wins wherever it and Stylix both theme an application, and
  # Stylix covers whatever Catppuccin has no port for, from the same palette
  # (see `stylix.nix`).
  #
  # Any port that is switched on hands its application over: the Stylix
  # target that competes with it loses its colors and keeps the rest (fonts,
  # sizes, opacity), or is switched off when it has nothing but colors. The
  # pairs are found by name, so ports and targets added upstream are picked
  # up as they come; `aliases` covers the pairs whose names differ. Used at
  # every level both projects have modules for: NixOS, nix-darwin, and Home
  # Manager.
  catppuccinOverStylix = {
    options,
    config,
    lib,
    ...
  }: let
    aliases = {
      nvim = "neovim";
      kvantum = "qt";
      qt5ct = "qt";
      tty = "console";
    };
    targetOf = port: aliases.${port} or port;

    # Removed and renamed options are invisible, and throw when read.
    isPort = port:
      lib.isAttrs port
      && port ? enable
      && lib.isOption port.enable
      && port.enable.visible or true != false;
    ports = lib.attrNames (lib.filterAttrs (_: isPort) options.catppuccin);
    contested = lib.filter (port: options.stylix.targets ? ${targetOf port}) ports;

    yield = target:
      if options.stylix.targets.${target} ? colors
      then {colors.enable = false;}
      else {enable = false;};
  in {
    stylix.targets = lib.mkMerge (map (port: {
        ${targetOf port} = lib.mkIf config.catppuccin.${port}.enable (yield (targetOf port));
      })
      contested);
  };

  catppuccin = {
    config,
    options,
    lib,
    ...
  }: let
    # Themed exactly where Stylix is: headless hosts have nothing to theme.
    enable = !config.headless;
  in {
    imports = [catppuccinOverStylix];

    catppuccin = {
      inherit enable;
      # One flavor for the whole system: every port, at every level, and
      # Stylix's palette.
      flavor = "mocha";
    };

    home-manager = lib.optionalAttrs (options ? home-manager) {
      sharedModules = [
        inputs.catppuccin.homeModules.catppuccin
        catppuccinOverStylix
        ({pkgs, ...}: {
          catppuccin = {
            inherit enable;
            inherit (config.catppuccin) flavor accent;
            # Papirus is Linux-only and refuses to evaluate on macOS, where
            # GTK is configured but there is nothing for it to theme.
            gtk.icon.enable = lib.mkIf pkgs.stdenv.hostPlatform.isDarwin false;
          };
        })
      ];
    };
  };
in {
  flake.modules.nixos.catppuccin = catppuccin;
  flake.modules.darwin.catppuccin = catppuccin;
}
