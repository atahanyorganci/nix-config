# Immich for macOS hosts.
#
# nixpkgs builds Immich for Linux and FreeBSD only, but every runtime
# dependency (vips, libheif, libraw, imagemagick, jellyfin-ffmpeg, exiftool)
# builds on Darwin too, so the server only needs its platforms widened, and
# Apple's `libtool` (cctools): node-gyp's Darwin build of better-sqlite3
# archives its static SQLite library with `libtool -static`.
#
# The machine-learning component (`immich-ml`) inherits those platforms and
# patches two Linux library paths into its ONNX Runtime session: OpenVINO's C
# API and libOpenCL, both only reached with the OpenVINO execution provider.
# On Darwin the session picks CoreML instead, and OpenVINO (with Intel's
# level-zero) does not build there, so both are replaced with an empty
# directory: upstream's patch still runs, including its immich-model revision
# check, and writes paths nothing on Darwin reads.
#
# Linux keeps the stock packages (and the binary cache).
{
  flake.overlays.immich = final: prev: let
    inherit (final) lib;
    isDarwin = prev.stdenv.hostPlatform.isDarwin;
    # Read upstream's expression as text: evaluating its `postPatch` here
    # would instantiate OpenVINO just to look.
    upstreamMl = builtins.readFile (final.path + "/pkgs/by-name/im/immich-ml/package.nix");
  in {
    immich =
      if !isDarwin
      then prev.immich
      else
        prev.immich.overrideAttrs (old: {
          nativeBuildInputs = old.nativeBuildInputs ++ [final.cctools];

          meta =
            old.meta
            // {
              platforms = lib.unique (old.meta.platforms ++ lib.platforms.darwin);
            };
        });

    immich-ml =
      if !isDarwin
      then prev.immich-ml
      else
        assert lib.assertMsg (
          lib.hasInfix "lib.getLib openvino" upstreamMl && lib.hasInfix "lib.getLib ocl-icd" upstreamMl
        ) "immich overlay: immich-ml no longer patches OpenVINO/OpenCL paths, revisit the Darwin override";
          prev.immich-ml.override {
            openvino = final.emptyDirectory;
            ocl-icd = final.emptyDirectory;
          };
  };

  perSystem = {
    lib,
    pkgs,
    ...
  }: {
    packages = lib.optionalAttrs pkgs.stdenv.hostPlatform.isDarwin {
      inherit (pkgs) immich immich-ml;
    };
  };
}
