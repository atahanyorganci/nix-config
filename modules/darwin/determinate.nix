{inputs, ...}: {
  flake.modules.darwin.determinate = {
    lib,
    pkgs,
    ...
  }: let
    customConf = "/etc/nix/nix.custom.conf";
  in {
    imports = [inputs.determinate.darwinModules.default];

    # Determinate Nix owns the daemon and `/etc/nix/nix.conf`, so nix-darwin's
    # own Nix management (`nix.*`) stays off and is ignored. Nix settings go
    # in `determinateNix.customSettings`, which the module writes to
    # `/etc/nix/nix.custom.conf` (included by Determinate's `nix.conf`).
    determinateNix.enable = true;

    # The Determinate installer leaves a comment-only `nix.custom.conf`, which
    # nix-darwin refuses to replace unless it recognises the contents. These
    # are the installer defaults nix-darwin's own Nix module also accepts.
    environment.etc."nix/nix.custom.conf".knownSha256Hashes = [
      # DetSys installer v0.33.0
      "6787fade1cf934f82db554e78e1fc788705c2c5257fddf9b59bdd963ca6fec63"
      # DetSys installer v0.34.0
      "3bd68ef979a42070a44f8d82c205cfd8e8cca425d91253ec2c10a88179bb34aa"
    ];

    # The daemon only reads its configuration at startup. `/run/current-system`
    # still points at the previous generation here, so restart it when the
    # custom configuration changed. Last, so Home Manager's activation (which
    # talks to the daemon) has already finished.
    system.activationScripts.postActivation.text = lib.mkAfter ''
      if ! cmp -s ${customConf} /run/current-system${customConf}; then
        echo "restarting Determinate Nix daemon to apply ${customConf}..." >&2
        launchctl kickstart -k system/systems.determinate.nix-daemon
        for _ in $(seq 1 30); do
          /nix/var/nix/profiles/default/bin/nix-store --store daemon -q --hash ${pkgs.stdenv.shell} >/dev/null 2>&1 && break
          sleep 1
        done
      fi
    '';
  };
}
