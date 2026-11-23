# Packages taken as the build Hydra finished, through nixpkgs-multiverse.
#
# `multiverse.fast.version` maps an (attribute, version) to the store path
# Hydra built for it, stepping back to the last finished build of that same
# version when its newest one failed, and hands it over as a substitute-only
# derivation: no nixpkgs fetch, no evaluation, no build.
#
# - opentelemetry-collector-contrib: Hydra's build of 0.155.0 fails at the
#   nixpkgs pin (cockroachdb/swiss no longer compiles), so the pin's own path
#   is in no cache; this serves the 0.155.0 Hydra did finish.
# - pihole-ftl, pihole, pihole-web: Hydra builds these at the pin, so this is
#   the same path the pin has; listed so they keep substituting if it fails.
#
# The version is always the pin's own, so this never moves a package. When
# the pin moves to a version the multiverse has no build of yet, evaluation
# fails naming it; drop the entry once the pin's own build is cached.
#
# The fake carries no `meta.mainProgram` (`getExe`) and no `src` (the Pi-hole
# FTL module reads `src.tag`), so both come from the pin's package of the same
# version; neither is built.
{inputs, ...}: {
  flake.overlays.multiverse = _final: prev: let
    mv = inputs.multiverse.multiverse.${prev.stdenv.hostPlatform.system};
    fromHydra = attr: let
      own = prev.${attr};
    in
      mv.fast.version attr own.version
      // {inherit (own) meta;}
      // prev.lib.optionalAttrs (own ? src) {inherit (own) src;};
  in
    prev.lib.optionalAttrs prev.stdenv.hostPlatform.isLinux {
      opentelemetry-collector-contrib = fromHydra "opentelemetry-collector-contrib";
      pihole-ftl = fromHydra "pihole-ftl";
      pihole = fromHydra "pihole";
      pihole-web = fromHydra "pihole-web";
    };
}
