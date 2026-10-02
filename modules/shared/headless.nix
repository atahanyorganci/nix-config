{...}: let
  module = {lib, ...}: {
    options.headless = lib.mkOption {
      type = lib.types.bool;
      default = false;
      example = true;
      description = ''
        Whether this host has no display and is only used over SSH. A headless
        host skips desktop-only configuration, such as Stylix theming and its
        fonts, which otherwise has to be built on every deploy for nothing.
      '';
    };
  };
in {
  flake.modules.nixos.headless = module;
  flake.modules.darwin.headless = module;
}
