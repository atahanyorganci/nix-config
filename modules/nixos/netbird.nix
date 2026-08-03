{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.nixos.netbird = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.netbird;
    client = config.services.netbird.clients.wt0;
    ip = lib.getExe' pkgs.iproute2 "ip";
    getent = lib.getExe' pkgs.unixtools.getent "getent";
    controlPlaneHost = let
      match = builtins.match "^[^:]+://([^/:]+)(:[0-9]+)?(/.*)?$" cfg.managementUrl;
    in
      if match == null
      then throw "netbird.managementUrl must contain an HTTP(S) hostname"
      else builtins.elemAt match 0;
    controlPlaneRouting = pkgs.writeShellScript "netbird-wt0-control-plane-routing" ''
      set -eu

      state_file="/run/${client.dir.baseName}/control-plane-routes"

      remove_routes() {
        if [ -f "$state_file" ]; then
          while IFS= read -r address; do
            ${ip} -4 route del "$address/32" 2>/dev/null || true
          done < "$state_file"
          rm -f "$state_file"
        fi
      }

      remove_routes

      if [ "$1" = add ]; then
        read -r default_route < <(${ip} -4 route show table main default)
        gateway=
        device=
        set -- $default_route
        while [ "$#" -gt 0 ]; do
          case "$1" in
            via)
              gateway="$2"
              shift 2
              ;;
            dev)
              device="$2"
              shift 2
              ;;
            *)
              shift
              ;;
          esac
        done

        if [ -z "$device" ]; then
          echo "No IPv4 default route available for NetBird control traffic" >&2
          exit 1
        fi

        declare -A seen=()
        while read -r address _; do
          if [ -n "''${seen[$address]+x}" ]; then
            continue
          fi
          seen["$address"]=1

          if [ -n "$gateway" ]; then
            ${ip} -4 route replace "$address/32" via "$gateway" dev "$device"
          else
            ${ip} -4 route replace "$address/32" dev "$device"
          fi
          printf '%s\n' "$address" >> "$state_file"
        done < <(${getent} ahostsv4 ${lib.escapeShellArg controlPlaneHost})

        if [ ! -s "$state_file" ]; then
          echo "Could not resolve NetBird control host ${controlPlaneHost}" >&2
          exit 1
        fi
      fi
    '';
  in {
    options.netbird = {
      enable = lib.mkEnableOption "NetBird client (connect to self-hosted management)";
      managementUrl = lib.mkOption {
        type = lib.types.str;
        default = "https://${infra.netbirdManagementDomain}";
        description = "NetBird management service URL.";
      };
      setupKeyFile = lib.mkOption {
        type = lib.types.nullOr lib.types.str;
        default = null;
        example = "/var/lib/netbird-client/setup.key";
        description = ''
          Path to a setup key file for unattended login.
          Keep this outside the Nix store (e.g. under /var/lib).
        '';
      };
      package = lib.mkOption {
        type = lib.types.package;
        default = pkgs.netbird;
        defaultText = lib.literalExpression "pkgs.netbird";
        description = "NetBird client package (from flake overlay).";
      };
    };
    config = lib.mkIf cfg.enable {
      # NetBird DNS resolution uses systemd-resolved.
      services.resolved.enable = true;
      services.netbird.package = cfg.package;
      # Client routes (exit nodes, network resources) and server routes (routing
      # peers) need loose rp_filter and IP forwarding respectively.
      services.netbird.useRoutingFeatures = lib.mkDefault "both";
      services.netbird.clients.wt0 = {
        port = 51820;
        openFirewall = true;
        openInternalFirewall = true;
        environment = {
          NB_MANAGEMENT_URL = cfg.managementUrl;
          NB_ADMIN_URL = cfg.managementUrl;
        };
        # Detect WAN changes and recover when client routes would otherwise
        # black-hole management traffic during bootstrap (off by default on Linux).
        config = {
          NetworkMonitor = true;
          DisableClientRoutes = false;
        };
        login = lib.mkIf (cfg.setupKeyFile != null) {
          enable = true;
          setupKeyFile = cfg.setupKeyFile;
        };
      };
      # Wait for routable WAN before the daemon applies client routes.
      systemd.services.netbird-wt0 = {
        after = lib.mkAfter ["network-online.target"];
        wants = ["network-online.target"];
        # NetBird 0.75 does not mark every management/signal/relay socket.
        # Keep the resolved control endpoint in the main table so its unmarked
        # sockets cannot be captured by an exit-node default route.
        serviceConfig = {
          ExecStartPre = lib.mkBefore ["+${controlPlaneRouting} add"];
          ExecStopPost = lib.mkAfter ["+${controlPlaneRouting} remove"];
        };
      };
      # Skip login (don't fail activation) until the setup key file exists.
      systemd.services.netbird-wt0-login = lib.mkIf (cfg.setupKeyFile != null) {
        unitConfig.ConditionPathExists = cfg.setupKeyFile;
        serviceConfig.script = let
          nb = lib.getExe config.services.netbird.clients.wt0.wrapper;
        in ''
          set -x

          get_status() {
            ${nb} status 2>&1 || :
          }

          main() {
            until get_status | grep --quiet ': Connected\|NeedsLogin'; do
              sleep 1
            done

            if get_status | grep --quiet 'NeedsLogin'; then
              ${nb} up --network-monitor=true
            fi
          }

          main "$@"
        '';
      };
    };
  };
}
