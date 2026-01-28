{
  lib,
  config,
  ...
}: {
  options.mdns.enable = lib.mkEnableOption "mDNS/DNS-SD";
  config = lib.mkIf config.mdns.enable {
    services.avahi = {
      enable = true;
      # `.local` domain resolution for NSS
      nssmdns4 = true;
      # Publish mDNS/DNS-SD services
      publish = {
        enable = true;
        # Register mDNS records for all local addresses
        addresses = true;
        # Announce local domain to other devices on the network
        domain = true;
        # Publish mDNS HINFO records (hardware type and version)
        hinfo = true;
        # Publish user services (e.g., SSH, HTTP)
        userServices = true;
        # Register type of machine (workstation, server, etc.)
        workstation = true;
      };
    };
    # Open mDNS port (5353/udp) for multicast DNS
    networking.firewall.allowedUDPPorts = [5353];
  };
}
