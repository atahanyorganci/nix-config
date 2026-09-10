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
    head = lib.getExe' pkgs.coreutils "head";
    cut = lib.getExe' pkgs.coreutils "cut";
    sort = lib.getExe' pkgs.coreutils "sort";
    sleep = lib.getExe' pkgs.coreutils "sleep";
    controlPlane = let
      match = builtins.match "^([a-z]+)://([^/:]+)(:([0-9]+))?(/.*)?$" cfg.managementUrl;
    in
      if match == null
      then throw "netbird.managementUrl must contain an HTTP(S) hostname"
      else let
        scheme = builtins.elemAt match 0;
        port = builtins.elemAt match 3;
      in {
        inherit scheme;
        host = builtins.elemAt match 1;
        port =
          if port != null
          then port
          else if scheme == "https"
          then "443"
          else "80";
      };
    controlPlaneHost = controlPlane.host;
    # The daemon reads its control plane from the on-disk config and only ever
    # rewrites it during a login, which cannot be driven reliably from a unit
    # (the CLI needs a writable profile directory it does not have here). Pin it
    # before the daemon starts instead: the peer's private key is untouched, so
    # it reconnects to the same account as the same peer.
    repointConfig = pkgs.writeShellScript "netbird-wt0-repoint" ''
      set -u

      config=${lib.escapeShellArg "${client.dir.state}/config.json"}
      desired=${lib.escapeShellArg "${controlPlane.host}:${controlPlane.port}"}

      # Nothing to do before the first login writes a config.
      [ -f "$config" ] || exit 0

      current=$(${lib.getExe pkgs.jq} -r '.ManagementURL.Host // empty' "$config" 2>/dev/null || :)
      [ "$current" = "$desired" ] && exit 0

      echo "netbird-wt0: repointing from ''${current:-unset} to $desired" >&2
      tmp=$(${lib.getExe' pkgs.coreutils "mktemp"}) || exit 0
      if ${lib.getExe pkgs.jq} \
        --arg scheme ${lib.escapeShellArg controlPlane.scheme} \
        --arg host "$desired" \
        '.ManagementURL.Scheme = $scheme
         | .ManagementURL.Host = $host
         | if .AdminURL then .AdminURL.Scheme = $scheme | .AdminURL.Host = $host else . end' \
        "$config" >"$tmp"; then
        # Redirect rather than move, so ownership and mode are preserved.
        ${lib.getExe' pkgs.coreutils "cat"} "$tmp" >"$config"
      else
        echo "netbird-wt0: could not rewrite $config; leaving it alone" >&2
      fi
      ${lib.getExe' pkgs.coreutils "rm"} -f "$tmp"
    '';
    controlPlaneRouting = pkgs.writeShellScript "netbird-wt0-control-plane-routing" ''
      set -u

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

      if [ "$1" != add ]; then
        exit 0
      fi

      # Boot and nixos-rebuild activation can briefly leave the host without a
      # default route or working name resolution. Wait a while, then give up
      # without failing the unit: these pins only matter once an exit-node
      # route is installed, and the daemon must come up regardless.
      attempt=0
      while :; do
        default_route=$(${ip} -4 route show table main default 2>/dev/null | ${head} -n 1)
        addresses=$(${getent} ahostsv4 ${lib.escapeShellArg controlPlaneHost} 2>/dev/null | ${cut} -d ' ' -f 1 | ${sort} -u)
        if [ -n "$default_route" ] && [ -n "$addresses" ]; then
          break
        fi
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 30 ]; then
          echo "netbird-wt0: no default route or cannot resolve ${controlPlaneHost} after 30s; not pinning control-plane routes" >&2
          exit 0
        fi
        ${sleep} 1
      done

      gateway=
      device=
      read -r -a route_words <<< "$default_route"
      set -- "''${route_words[@]}"
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
        echo "netbird-wt0: default route has no device; not pinning control-plane routes" >&2
        exit 0
      fi

      while IFS= read -r address; do
        if [ -n "$gateway" ]; then
          ${ip} -4 route replace "$address/32" via "$gateway" dev "$device"
        else
          ${ip} -4 route replace "$address/32" dev "$device"
        fi || {
          echo "netbird-wt0: could not pin $address via $device" >&2
          continue
        }
        printf '%s\n' "$address" >> "$state_file"
      done <<< "$addresses"
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
      # The upstream module runs the hardened client as its own user and ships a
      # polkit rule granting it the systemd-resolved actions, but that rule only
      # takes effect when polkit itself runs; without it every DNS update fails
      # with "Permission denied".
      security.polkit.enable = true;
      # NetBird 0.75 also sets DNSOverTLS on the link and flushes caches, which
      # the upstream rule predates.
      security.polkit.extraConfig = ''
        polkit.addRule(function(action, subject) {
          var actions = [
            "org.freedesktop.resolve1.set-dns-over-tls",
            "org.freedesktop.resolve1.flush-caches",
          ];
          if (actions.indexOf(action.id) >= 0 && subject.user == "netbird-wt0") {
            return polkit.Result.YES;
          }
        });
      '';
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
          ExecStartPre = lib.mkBefore ["+${repointConfig}" "+${controlPlaneRouting} add"];
          ExecStopPost = lib.mkAfter ["+${controlPlaneRouting} remove"];
        };
      };
      # Skip login (don't fail activation) until the setup key file exists.
      #
      # This must be `script`, not `serviceConfig.script`: the latter is emitted
      # as a `script=` key in `[Service]`, which systemd ignores with "Unknown
      # key", so the override silently never runs.
      systemd.services.netbird-wt0-login = lib.mkIf (cfg.setupKeyFile != null) {
        unitConfig.ConditionPathExists = cfg.setupKeyFile;
        # `script` is a `lines` option: without mkForce this is appended to
        # upstream's login script instead of replacing it, so upstream's wait
        # loop still spins forever when the control plane is unreachable.
        script = lib.mkForce (let
          nb = lib.getExe config.services.netbird.clients.wt0.wrapper;
        in ''
          # Upstream only logs in when the daemon reports NeedsLogin, and the
          # daemon only persists a management URL when a login carries one. A
          # changed `managementUrl` would therefore leave the peer talking to
          # the old control plane forever, because an unreachable one reports
          # Disconnected rather than NeedsLogin. Log in whenever the daemon is
          # not already connected to the configured host.
          # The URL is only printed with --detail; plain `status` just says
          # `Management: Connected`, which would never match below.
          status() {
            ${nb} status --detail 2>&1 || :
          }

          # `netbird status --detail` prints `Management: Connected to <url>`
          # including the port, so match the host alone.
          connected_here() {
            status | grep --quiet 'Management: Connected to .*${controlPlaneHost}'
          }

          connected_elsewhere() {
            status | grep 'Management: Connected to ' | grep --quiet --invert-match ${lib.escapeShellArg controlPlaneHost}
          }

          needs_login() {
            status | grep --quiet NeedsLogin
          }

          # Give the daemon a moment to settle before deciding, so an ordinary
          # restart does not trigger a needless re-login.
          waited=0
          while :; do
            if connected_here; then
              exit 0
            fi
            if needs_login || connected_elsewhere || [ "$waited" -ge 30 ]; then
              break
            fi
            waited=$((waited + 1))
            sleep 1
          done

          # `netbird up` returns early with "Already connected" and ignores the
          # new URL while the daemon still holds a session, so drop it first.
          # Only when it is connected somewhere else: after a timeout the daemon
          # has no session, and tearing one down we failed to re-establish would
          # leave the peer offline.
          if connected_elsewhere; then
            ${nb} down || :
          fi

          # Carries the desired URL so the daemon persists it and reconnects as
          # the same peer; the setup key in $NB_SETUP_KEY_FILE is picked up
          # automatically when a login is really required. A failure here must
          # never fail activation.
          # Bounded: a bare `netbird up` blocks indefinitely when it cannot
          # reach the control plane, which stalls the whole activation and with
          # it any deploy that is switching this host.
          attempt=0
          until ${lib.getExe' pkgs.coreutils "timeout"} 60 ${nb} up --management-url ${lib.escapeShellArg cfg.managementUrl}; do
            attempt=$((attempt + 1))
            if [ "$attempt" -ge 3 ]; then
              echo "netbird-wt0-login: could not log in to ${cfg.managementUrl}; retrying on the next start" >&2
              break
            fi
            sleep 5
          done
        '');
      };
    };
  };
}
