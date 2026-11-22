# extism-js-core (built for wasm32-wasip1) on macOS build machines.
#
# Immich builds its plugins with extism-js, which embeds extism-js-core
# cross-compiled to WebAssembly. Cargo's build scripts (rquickjs-sys's among
# them) still run on the build machine, and Rust's standard library on Darwin
# links libiconv, which the cross package set does not give the build-side
# linker:
#
#   ld: library not found for -liconv
#
# Provide it for build-side tools (`depsBuildBuild`), together with the
# build-side compiler wrapper itself: a dependency's flags only reach a
# wrapper whose setup hook runs in the same build. Only the WebAssembly
# package built on Darwin changes; Linux builds keep their binary cache.
{
  flake.overlays.extism-js-core = _final: prev: {
    extism-js-core =
      if !(prev.stdenv.hostPlatform.isWasi && prev.stdenv.buildPlatform.isDarwin)
      then prev.extism-js-core
      else
        prev.extism-js-core.overrideAttrs (old: {
          depsBuildBuild =
            (old.depsBuildBuild or [])
            ++ [
              prev.pkgsBuildBuild.stdenv.cc
              prev.pkgsBuildBuild.libiconv
            ];
        });
  };
}
