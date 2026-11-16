# The Synology NAS. DSM runs it, not this flake: NetBird is installed and
# enrolled on it by hand, and the stack adopts the `nas` peer from here.
{...}: {
  flake.externalPeers.nas = {
    netbird.group = "Server";
    # DSM at nas.<domain>, for people's devices. DSM signs them in itself,
    # through Authelia (mars's `synology-dsm` client, for the same groups).
    httpServices.nas = {
      port = 5000;
      expose = {
        enable = true;
        accessGroups = ["Admin" "User"];
      };
    };
  };
}
