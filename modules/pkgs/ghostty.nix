{inputs, ...}: {
  # On Darwin, Ghostty comes from a Homebrew cask that ships only
  # `Applications/Ghostty.app`, leaving the CLI buried inside the bundle with
  # no `$out/bin` entry.
  #
  # Home Manager validates the generated config with `lib.getExe cfg.package`,
  # which resolves to `$out/bin/<mainProgram>`. Without a `bin` entry that
  # `onChange` hook pointed at a path that does not exist, so config
  # validation silently never ran, and `getExe` additionally warned about the
  # missing `meta.mainProgram`.
  #
  # Done as an overlay rather than at each use site so the Home Manager module
  # and the dock entry in `modules/darwin/system.nix` resolve to the same store
  # path; overriding separately would put two ~62M copies in the closure.
  flake.overlays.ghostty = final: prev:
    prev.lib.optionalAttrs prev.stdenv.hostPlatform.isDarwin {
      ghostty = let
        cask = inputs.nix-casks.packages.${final.stdenv.hostPlatform.system}.ghostty;
      in
        cask.overrideAttrs (prevAttrs: {
          # The leading blank line is required: the cask's `installPhase` is
          # built with `concatStringsSep "\n"` and has no trailing newline, so
          # appending without it fuses onto the final `ln` command (which then
          # fails with `ln: invalid option -- 'p'`).
          #
          # The symlink is added inside the cask derivation rather than with
          # `symlinkJoin` so the signed `.app` remains a real directory.
          installPhase =
            prevAttrs.installPhase
            + ''

              mkdir -p "$out/bin"
              ln -s "$out/Applications/Ghostty.app/Contents/MacOS/ghostty" "$out/bin/ghostty"
            '';
          meta = prevAttrs.meta // {mainProgram = "ghostty";};
        });
    };
}
