{
  config,
  lib,
  pkgs,
  user,
  ...
}: let
  inherit
    (lib)
    mkEnableOption
    mkOption
    types
    mkPackageOption
    mkIf
    ;
  cfg = config.services.transmission;
  settingsFormat = pkgs.formats.json {};
  settingsFile = settingsFormat.generate "settings.json" cfg.settings;
in {
  options = {
    services.transmission = {
      enable =
        mkEnableOption "transmission"
        // {
          description = ''
            Whether to enable the headless Transmission BitTorrent daemon.

            Transmission daemon can be controlled via the RPC interface using
            transmission-remote, the WebUI (http://127.0.0.1:9091/ by default),
            or other clients like stig or tremc.

            Note: This module uses snake_case configuration keys as introduced in
            Transmission 4.1.0. The old kebab-case keys are deprecated and will be
            removed in Transmission 5.
          '';
        };
      settings = mkOption {
        description = ''
          Settings whose options overwrite fields in `config/settings.json`.
          Uses snake_case keys as per Transmission 4.1.0+ format.
        '';
        default = {};
        type = types.submodule {
          options = {
            # IP Announce
            announce_ip = mkOption {
              type = types.nullOr types.str;
              default = "";
              description = "Alternative IP address to announce to the tracker.";
            };
            announce_ip_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "When enabled, `announce_ip` value is used instead of the client's address visible to the tracker for announcement requests.";
            };
            # Bandwidth
            alt_speed_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable alternate (turtle mode) speed limits.";
            };
            alt_speed_up = mkOption {
              type = types.int;
              default = 50;
              description = "Alternate (turtle mode) upload speed limit in kB/s.";
            };
            alt_speed_down = mkOption {
              type = types.int;
              default = 50;
              description = "Alternate (turtle mode) download speed limit in kB/s.";
            };
            speed_limit_down = mkOption {
              type = types.int;
              default = 100;
              description = "Download speed limit in kB/s.";
            };
            speed_limit_down_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable download speed limit.";
            };
            speed_limit_up = mkOption {
              type = types.int;
              default = 100;
              description = "Upload speed limit in kB/s.";
            };
            speed_limit_up_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable upload speed limit.";
            };
            upload_slots_per_torrent = mkOption {
              type = types.int;
              default = 14;
              description = "Number of upload slots per torrent.";
            };
            # Blocklist
            blocklist_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable blocklist.";
            };
            blocklist_url = mkOption {
              type = types.str;
              default = "https://www.example.com/blocklist";
              description = "URL of the blocklist to use.";
            };
            # Files and Locations
            download_dir = mkOption {
              type = types.path;
              default = "/Users/${user.username}/Downloads";
              description = "Directory where to download torrents.";
            };
            incomplete_dir = mkOption {
              type = types.path;
              default = "/Users/${user.username}/Downloads/incomplete";
              description = "Directory to keep files in until torrent is complete.";
            };
            incomplete_dir_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "When enabled, new torrents will download the files to `incomplete_dir`. When complete, the files will be moved to `download_dir`.";
            };
            preallocation = mkOption {
              type = types.ints.between 0 2;
              default = 1;
              description = "File preallocation mode (0 = Off, 1 = Fast, 2 = Full).";
            };
            rename_partial_files = mkOption {
              type = types.bool;
              default = true;
              description = "Postfix partially downloaded files with \".part\".";
            };
            start_added_torrents = mkOption {
              type = types.bool;
              default = true;
              description = "Start torrents as soon as they are added.";
            };
            trash_can_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Whether to move the torrents to the system's trashcan or unlink them right away upon deletion from Transmission.";
            };
            trash_original_torrent_files = mkOption {
              type = types.bool;
              default = false;
              description = "Delete torrents added from the watch directory.";
            };
            umask = mkOption {
              type = types.str;
              default = "022";
              description = "Sets Transmission's file mode creation mask.";
            };
            watch_dir = mkOption {
              type = types.path;
              default = "/Users/${user.username}/Downloads/torrents";
              description = "Watch a directory for torrent files and add them to transmission.";
            };
            watch_dir_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Watch a directory for torrent files and add them to Transmission.";
            };
            watch_dir_force_generic = mkOption {
              type = types.bool;
              default = false;
              description = "Force to use a watch directory implementation that does not rely on OS-specific mechanisms. Useful when your watch directory is on a network location, such as CIFS or NFS.";
            };
            # Peer Settings
            peer_port = mkOption {
              type = types.port;
              default = 51413;
              description = "Port to listen for incoming peer connections.";
            };
            peer_port_random_on_start = mkOption {
              type = types.bool;
              default = false;
              description = "Randomize peer port on start.";
            };
            peer_port_random_low = mkOption {
              type = types.port;
              default = 1024;
              description = "Low end of random peer port range.";
            };
            peer_port_random_high = mkOption {
              type = types.port;
              default = 65535;
              description = "High end of random peer port range.";
            };
            port_forwarding_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable UPnP or NAT-PMP port forwarding.";
            };
            peer_limit_global = mkOption {
              type = types.int;
              default = 200;
              description = "Global maximum number of peers.";
            };
            peer_limit_per_torrent = mkOption {
              type = types.int;
              default = 50;
              description = "Maximum number of peers per torrent.";
            };
            bind_address_ipv4 = mkOption {
              type = types.str;
              default = "";
              description = "Where to listen for peer connections. Empty string binds to \"0.0.0.0\".";
            };
            bind_address_ipv6 = mkOption {
              type = types.str;
              default = "";
              description = "Where to listen for IPv6 peer connections.";
            };

            # Protocol Settings
            dht_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable Distributed Hash Table (DHT).";
            };
            lpd_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable Local Peer Discovery (LPD).";
            };
            pex_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable Peer Exchange (PEX).";
            };
            encryption = mkOption {
              type = types.enum ["allowed" "preferred" "required"];
              default = "preferred";
              description = "Encryption preference (allowed = prefer unencrypted, preferred = prefer encrypted, required = require encrypted).";
            };

            # RPC Settings
            rpc_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable RPC interface.";
            };
            rpc_bind_address = mkOption {
              type = types.str;
              default = "127.0.0.1";
              description = "Where to listen for RPC connections. Use \"0.0.0.0\" to listen on all interfaces.";
            };
            rpc_port = mkOption {
              type = types.port;
              default = 9091;
              description = "The RPC port to listen on.";
            };
            rpc_url = mkOption {
              type = types.str;
              default = "/transmission/";
              description = "URL path for the RPC interface.";
            };
            rpc_authentication_required = mkOption {
              type = types.bool;
              default = false;
              description = "Require authentication for RPC connections.";
            };
            rpc_username = mkOption {
              type = types.str;
              default = "";
              description = "Username for RPC authentication.";
            };
            rpc_password = mkOption {
              type = types.str;
              default = "";
              description = "Password for RPC authentication. Can be plaintext (will be salted on startup).";
            };
            rpc_whitelist_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable RPC IP whitelist.";
            };
            rpc_whitelist = mkOption {
              type = types.str;
              default = "127.0.0.1";
              description = "Comma-delimited list of IP addresses allowed for RPC. Wildcards allowed using '*'.";
            };
            rpc_host_whitelist_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable RPC host whitelist.";
            };
            rpc_host_whitelist = mkOption {
              type = types.str;
              default = "";
              description = "Comma-delimited list of domain names allowed for RPC. Wildcards allowed using '*'.";
            };
            anti_brute_force_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable brute force protection for the RPC server.";
            };
            anti_brute_force_threshold = mkOption {
              type = types.int;
              default = 100;
              description = "Number of failed authentication attempts before denying further attempts.";
            };

            # Queuing
            download_queue_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable download queue.";
            };
            download_queue_size = mkOption {
              type = types.int;
              default = 5;
              description = "Maximum number of torrents to download at once.";
            };
            seed_queue_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable seed queue.";
            };
            seed_queue_size = mkOption {
              type = types.int;
              default = 10;
              description = "Maximum number of torrents to seed at once.";
            };
            queue_stalled_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Consider torrents stalled after queue_stalled_minutes of inactivity.";
            };
            queue_stalled_minutes = mkOption {
              type = types.int;
              default = 30;
              description = "Minutes of inactivity before a torrent is considered stalled.";
            };

            # Ratio and Idle Limits
            ratio_limit = mkOption {
              type = types.float;
              default = 2.0;
              description = "Seed ratio limit.";
            };
            ratio_limit_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable seed ratio limit.";
            };
            idle_seeding_limit = mkOption {
              type = types.int;
              default = 30;
              description = "Stop seeding after being idle for N minutes.";
            };
            idle_seeding_limit_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable idle seeding limit.";
            };

            # Misc
            message_level = mkOption {
              type = types.ints.between 0 6;
              default = 4;
              description = "Log verbosity (0 = None, 1 = Critical, 2 = Error, 3 = Warn, 4 = Info, 5 = Debug, 6 = Trace).";
            };
            cache_size_mib = mkOption {
              type = types.int;
              default = 4;
              description = "Memory cache size in MiB.";
            };
            scrape_paused_torrents_enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Scrape paused torrents.";
            };

            # Scripts
            script_torrent_added_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Run a script when a torrent is added.";
            };
            script_torrent_added_filename = mkOption {
              type = types.str;
              default = "";
              description = "Path to script to run when a torrent is added.";
            };
            script_torrent_done_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Run a script when a torrent finishes downloading.";
            };
            script_torrent_done_filename = mkOption {
              type = types.str;
              default = "";
              description = "Path to script to run when a torrent finishes downloading.";
            };
            script_torrent_done_seeding_enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Run a script when a torrent finishes seeding.";
            };
            script_torrent_done_seeding_filename = mkOption {
              type = types.str;
              default = "";
              description = "Path to script to run when a torrent finishes seeding.";
            };
          };
        };
      };
      package = mkPackageOption pkgs "transmission_4" {
        example = "pkgs.transmission_4";
      };
      configDir = mkOption {
        type = types.path;
        default = "/Users/${user.username}/Library/Application Support/Transmission";
        description = "The directory where Transmission will store its configuration and data.";
      };
      logDir = mkOption {
        type = types.path;
        default = "/Users/${user.username}/Library/Logs/Transmission";
        description = "Directory where the Transmission logs will be stored.";
      };
      extraFlags = mkOption {
        type = types.listOf types.str;
        default = [];
        example = ["--log-debug"];
        description = "Extra flags passed to the transmission command in the service definition.";
      };
    };
  };

  config = mkIf cfg.enable {
    # Create necessary directories during system activation
    system.activationScripts.postActivation.text = ''
      echo "Creating Transmission directories..."

      mkdir -p '${cfg.configDir}' \
        && cp -f "${settingsFile}" '${cfg.configDir}/settings.json' \
        && chown -R '${user.username}' '${cfg.configDir}'
      mkdir -p '${cfg.logDir}' && chown -R '${user.username}' '${cfg.logDir}'
      mkdir -p '${cfg.settings.download_dir}' && chown -R '${user.username}' '${cfg.settings.download_dir}'
      mkdir -p '${cfg.settings.incomplete_dir}' && chown -R '${user.username}' '${cfg.settings.incomplete_dir}'
      mkdir -p '${cfg.settings.watch_dir}' && chown -R '${user.username}' '${cfg.settings.watch_dir}'
    '';

    launchd.user.agents.transmission = {
      serviceConfig = {
        Label = "com.transmissionbt.daemon";
        EnvironmentVariables = {
          # Use the new snake_case configuration format
          TR_SAVE_VERSION_FORMAT = "5";
        };
        ProgramArguments =
          [
            "${cfg.package}/bin/transmission-daemon"
            "--foreground"
            "--config-dir"
            "${cfg.configDir}"
            "--logfile"
            "${cfg.logDir}/transmission.log"
          ]
          ++ cfg.extraFlags;
        WorkingDirectory = cfg.configDir;
        RunAtLoad = true;
        KeepAlive = {
          SuccessfulExit = false;
          Crashed = true;
        };
        StandardOutPath = "${cfg.logDir}/launchd-stdout.log";
        StandardErrorPath = "${cfg.logDir}/launchd-stderr.log";
        ProcessType = "Background";
        ThrottleInterval = 15;
      };
    };
    # Make transmission CLI tools available in PATH
    environment.systemPackages = [cfg.package];
  };
}
