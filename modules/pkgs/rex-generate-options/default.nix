{...}: {
  # `nix run .#rex-generate-options [-- --check]` regenerates the `rex.settings`
  # option declarations (modules/home/rex/generated/settings-options.nix) from
  # the Swift metadata of the pinned Rex.app, so the options always describe
  # the app that actually gets installed. See ./generate-options.py.
  perSystem = {
    pkgs,
    lib,
    ...
  }: {
    packages = lib.optionalAttrs (pkgs ? rex-app) {
      rex-generate-options = pkgs.writeShellApplication {
        name = "rex-generate-options";
        runtimeInputs = with pkgs; [alejandra git ipsw python3];
        # Output goes into the checkout `nix run` is invoked from; a later
        # `--out` on the command line overrides it (argparse keeps the last).
        text = ''
          root="$(git rev-parse --show-toplevel)"
          exec python3 ${./generate-options.py} \
            --app ${pkgs.rex-app}/Applications/Rex.app \
            --formatter 'alejandra -q -' \
            --out "$root/modules/home/rex/generated/settings-options.nix" \
            "$@"
        '';
        meta = {
          description = "Generate rex.settings Home Manager options from Rex.app's Swift metadata";
          platforms = ["aarch64-darwin"];
        };
      };
    };
  };
}
