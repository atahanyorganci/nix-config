# A launcher at a fixed path that holds macOS privacy grants (TCC) for the
# services it starts.
#
# macOS ties a grant such as Network Volumes or Full Disk Access to a binary,
# and a launchd job's file access is charged to the job's top-level program.
# Nix services move to a new store path on every update, so a grant to the
# service itself is lost each time, and a background job without one hangs on
# a prompt (GUI session) or is refused (system daemons). Services run through
# this launcher instead: it starts the program as a child and waits, so the
# program's access, and its children's, is charged to the launcher.
#
# The launcher is copied to `path` only when its bytes change. macOS keys an
# ad-hoc signed binary's grant to its code hash, so the grant survives every
# rebuild that leaves the launcher alone (it changes only with its source or
# the C toolchain); activation warns when it was replaced.
{
  flake.modules.darwin.tcc-launcher = {
    config,
    lib,
    pkgs,
    ...
  }: let
    cfg = config.tccLauncher;

    launcher = pkgs.runCommandCC "tcc-launcher" {} ''
      mkdir -p $out/bin
      $CC -O2 -Wall -Werror -o $out/bin/tcc-launcher ${./launcher.c}
    '';
  in {
    options.tccLauncher = {
      enable = lib.mkEnableOption "the fixed-path launcher that holds macOS privacy grants for services";

      path = lib.mkOption {
        type = lib.types.str;
        default = "/usr/local/libexec/nix-tcc-launcher";
        description = ''
          Where the launcher is installed. Grant it Full Disk Access once
          (System Settings > Privacy & Security > Full Disk Access), or allow
          its first Network Volumes prompt.
        '';
      };

      package = lib.mkOption {
        type = lib.types.package;
        readOnly = true;
        default = launcher;
        description = "The launcher build.";
      };
    };

    config = lib.mkIf cfg.enable {
      # Before launchd (re)starts the services that run through it.
      system.activationScripts.extraActivation.text = ''
        if ! cmp -s ${launcher}/bin/tcc-launcher ${lib.escapeShellArg cfg.path}; then
          echo "Installing the privacy-grant launcher at ${cfg.path}..."
          install -d -m 0755 "$(dirname ${lib.escapeShellArg cfg.path})"
          install -m 0755 -o root -g wheel ${launcher}/bin/tcc-launcher ${lib.escapeShellArg cfg.path}
          echo "warning: the launcher at ${cfg.path} is new; grant it Full Disk Access" >&2
          echo "  (System Settings > Privacy & Security > Full Disk Access, + and Cmd-Shift-G)," >&2
          echo "  or allow its Network Volumes prompt, then restart the services that use it." >&2
        fi
      '';
    };
  };
}
