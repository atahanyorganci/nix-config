{
  inputs,
  lib,
  ...
}: let
  # Catppuccin's palette, at the revision catppuccin/nix pins for its
  # `palette` package (`pkgs/sources.json`). Fetched here rather than read
  # from that package: reading a build's output is import-from-derivation, so
  # evaluating a Linux host on macOS would need a Linux builder. The pin's
  # hash is the package source's, so both land on the same store path.
  palette = let
    pin = (lib.importJSON "${inputs.catppuccin}/pkgs/sources.json").palette;
    src = builtins.fetchTree {
      type = "github";
      owner = "catppuccin";
      repo = "palette";
      inherit (pin) rev;
      narHash = pin.hash;
    };
  in
    lib.importJSON "${src}/palette.json";

  # A flavor as a base16 scheme, slot for slot as Catppuccin's own base16 port
  # maps it (`base16.tera` in catppuccin/base16).
  base16Scheme = flavor: let
    inherit (palette.${flavor}) name colors;
    hex = color: lib.removePrefix "#" colors.${color}.hex;
  in {
    scheme = "Catppuccin ${name}";
    author = "https://github.com/catppuccin/catppuccin";
    base00 = hex "base";
    base01 = hex "mantle";
    base02 = hex "surface0";
    base03 = hex "surface1";
    base04 = hex "surface2";
    base05 = hex "text";
    base06 = hex "rosewater";
    base07 = hex "lavender";
    base08 = hex "red";
    base09 = hex "peach";
    base0A = hex "yellow";
    base0B = hex "green";
    base0C = hex "teal";
    base0D = hex "blue";
    base0E = hex "mauve";
    base0F = hex "flamingo";
  };

  stylix = {
    config,
    options,
    lib,
    pkgs,
    ...
  }: let
    monospace = pkgs.cascadia-code;
    # Set in `catppuccin.nix`, which also makes Catppuccin's own ports win
    # over Stylix wherever both theme an application.
    inherit (config.catppuccin) flavor;
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
      polarity =
        if palette.${flavor}.dark
        then "dark"
        else "light";
      base16Scheme = base16Scheme flavor;
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
