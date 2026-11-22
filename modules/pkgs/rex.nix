{inputs, ...}: {
  # Rex: the terminal multiplexer from Superlogical. Upstream publishes a
  # prebuilt flake per release channel (here: preview) that repackages the
  # release binary and handles the Linux quirks: rpath set before the
  # interpreter (NixOS/patchelf#674), `dontPatchELF` so the dlopen'd PAM path
  # survives, `dontStrip` to keep the macOS signature, plus the `xterm-rex`
  # terminfo entry and ssh guard that only ship with the flake tarball.
  #
  # flake.lock records the release's immutable URL, so bump with
  # `nix flake update rex`.
  #
  # This intentionally shadows nixpkgs' `rex`, the unrelated (R)?ex Perl
  # automation framework.
  #
  # The guard reads `prev`: an overlay whose attribute names depend on `final`
  # recurses infinitely.
  flake.overlays.rex = _final: prev: let
    system = prev.stdenv.hostPlatform.system;
  in
    prev.lib.optionalAttrs (inputs.rex.packages ? ${system}) {
      rex = inputs.rex.packages.${system}.rex;
    };

  perSystem = {
    pkgs,
    lib,
    system,
    ...
  }: {
    packages = lib.optionalAttrs (inputs.rex.packages ? ${system}) {
      inherit (pkgs) rex;
    };
  };
}
