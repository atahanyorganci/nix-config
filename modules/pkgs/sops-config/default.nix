{
  config,
  lib,
  inputs,
  ...
}: let
  # Every NixOS and nix-darwin host with a pinned SSH host key can receive
  # secrets; its pin is its recipient.
  pinnedHostKeys = lib.filterAttrs (_: key: key != null) (
    lib.mapAttrs (_: system: system.config.hostInventory.ssh.hostKey) (
      config.flake.nixosConfigurations // config.flake.darwinConfigurations
    )
  );

  spec = {
    inherit (config.flake.sops) admins;
    hosts = pinnedHostKeys;
  };
in {
  perSystem = {
    pkgs,
    config,
    ...
  }: {
    packages.sops-config = pkgs.writeShellApplication {
      name = "sops-config";
      runtimeInputs = with pkgs; [sops ssh-to-age jq yq-go diffutils findutils coreutils gnused];
      runtimeEnv.SOPS_SPEC = "${pkgs.writeText "sops-spec.json" (builtins.toJSON spec)}";
      text = builtins.readFile ./sops-config.sh;
    };

    # Fails when the secrets repository's `.sops.yaml`, or the recipients of
    # any file in it, no longer match the flake: e.g. a host was pinned or
    # re-keyed without regenerating them.
    checks.sops-config =
      pkgs.runCommand "sops-config-check" {
        nativeBuildInputs = [config.packages.sops-config];
      } ''
        sops-config check ${inputs.secrets}
        touch $out
      '';
  };
}
