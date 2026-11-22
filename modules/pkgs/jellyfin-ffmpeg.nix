{
  # jellyfin-ffmpeg fails to build on Darwin: its source tree has a `version`
  # file, and the build's `-I.` makes `#include <version>` (pulled in by
  # libc++ headers through OpenColorIO.h in `libavfilter/ocio_wrapper.cpp`)
  # resolve to it instead of the C++ standard header:
  #
  #   ./version:1:1: error: expected unqualified-id
  #
  # https://github.com/NixOS/nixpkgs/issues/579796 (Hydra fails too). Building
  # without OpenColorIO avoids the only C++ translation unit that hits it; it
  # only drives ffmpeg's `ocio` colour-management filter, which Jellyfin's
  # transcoding does not use. Drop this once the issue is fixed upstream.
  flake.overlays.jellyfin-ffmpeg = final: prev:
    prev.lib.optionalAttrs prev.stdenv.hostPlatform.isDarwin {
      jellyfin-ffmpeg = prev.jellyfin-ffmpeg.override {
        ffmpeg_8-full = final.ffmpeg_8-full.override {withOpenColorIO = false;};
      };
    };
}
