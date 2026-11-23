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
# Its `machine-learning` wrapper runs uvicorn directly instead of under
# gunicorn. A gunicorn worker is `fork()`ed from the arbiter without `exec`,
# and on macOS such a worker aborts the first time CoreML compiles a model for
# the GPU ("Unable to reach MTLCompilerService"), after which every refork dies
# on the Objective-C fork-safety check. The same app served by uvicorn in a
# process launchd exec'd runs CoreML fine. Upstream runs one worker anyway;
# launchd's KeepAlive restarts it as gunicorn's arbiter would.
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
          (prev.immich-ml.override {
            openvino = final.emptyDirectory;
            ocl-icd = final.emptyDirectory;
          }).overrideAttrs (old: let
            deps = old.passthru.dependencies;
            uvicorn =
              lib.findFirst (dep: (dep.pname or "") == "uvicorn")
              (throw "immich overlay: immich-ml no longer depends on uvicorn")
              deps;
            python = uvicorn.pythonModule;
          in {
            # Replaces upstream's gunicorn wrapper, keeping its search path and
            # defaults; the worker count and timeout were gunicorn's.
            postInstall =
              old.postInstall
              + ''
                rm "''${!outputBin}/bin/machine-learning"
                makeWrapper ${uvicorn}/bin/uvicorn "''${!outputBin}/bin/machine-learning" \
                  --prefix PYTHONPATH : "$out/${python.sitePackages}:${python.pkgs.makePythonPath deps}" \
                  --set-default MACHINE_LEARNING_CACHE_FOLDER /var/cache/immich \
                  --set-default IMMICH_HOST 127.0.0.1 \
                  --set-default IMMICH_PORT 3003 \
                  --add-flags 'immich_ml.main:app --host "$IMMICH_HOST" --port "$IMMICH_PORT"'
              '';
          });
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
