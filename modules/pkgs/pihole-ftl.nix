# pihole-ftl 6.7.1 builds with -Werror; newer GCC flags an unused counter in
# src/config/validator.c (sanitize_dns_hosts) via -Wunused-but-set-variable.
# Downgrade that one diagnostic back to a warning until upstream fixes it.
{
  flake.overlays.pihole-ftl = _final: prev: {
    pihole-ftl = prev.pihole-ftl.overrideAttrs (old: {
      env =
        (old.env or {})
        // {
          NIX_CFLAGS_COMPILE = toString [
            (old.env.NIX_CFLAGS_COMPILE or "")
            "-Wno-error=unused-but-set-variable"
          ];
        };
    });
  };
}
