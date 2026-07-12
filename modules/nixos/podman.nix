{
  flake.modules.nixos.podman = {
    lib,
    config,
    pkgs,
    user,
    ...
  }: {
    options.podman.enable = lib.mkEnableOption "rootless Podman (with a docker-compatible CLI)";
    config = lib.mkIf config.podman.enable {
      virtualisation = {
        containers.enable = true;
        oci-containers.backend = "podman";
        podman = {
          enable = true;
          # Provide a `docker` CLI that calls podman.
          dockerCompat = true;
          # Required for containers under podman-compose to talk to each other.
          defaultNetwork.settings.dns_enabled = true;
        };
      };
      # Rootless uid/gid mapping for the primary user.
      users.users.${user.username} = {
        subUidRanges = [
          {
            startUid = 100000;
            count = 65536;
          }
        ];
        subGidRanges = [
          {
            startGid = 100000;
            count = 65536;
          }
        ];
        # Keep user services (including rootless podman sockets) after logout/SSH.
        linger = true;
      };
      environment.systemPackages = with pkgs; [
        podman-compose
        slirp4netns
        fuse-overlayfs
      ];
    };
  };
}
