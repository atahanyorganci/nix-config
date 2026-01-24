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

            Note: This module uses kebab-case configuration keys which is compatible
            with all Transmission versions.
          '';
        };
      settings = mkOption {
        description = ''
          Settings whose options overwrite fields in `config/settings.json`.
          Uses kebab-case keys for compatibility across Transmission versions.
        '';
        default = {};
        type = types.submodule {
          options = {
            # IP Announce
            announce-ip = mkOption {
              type = types.nullOr types.str;
              default = "";
              description = "Alternative IP address to announce to the tracker.";
            };
            announce-ip-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "When enabled, `announce-ip` value is used instead of the client's address visible to the tracker for announcement requests.";
            };
            # Bandwidth
            alt-speed-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable alternate (turtle mode) speed limits.";
            };
            alt-speed-up = mkOption {
              type = types.int;
              default = 50;
              description = "Alternate (turtle mode) upload speed limit in kB/s.";
            };
            alt-speed-down = mkOption {
              type = types.int;
              default = 50;
              description = "Alternate (turtle mode) download speed limit in kB/s.";
            };
            speed-limit-down = mkOption {
              type = types.int;
              default = 100;
              description = "Download speed limit in kB/s.";
            };
            speed-limit-down-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable download speed limit.";
            };
            speed-limit-up = mkOption {
              type = types.int;
              default = 100;
              description = "Upload speed limit in kB/s.";
            };
            speed-limit-up-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable upload speed limit.";
            };
            upload-slots-per-torrent = mkOption {
              type = types.int;
              default = 14;
              description = "Number of upload slots per torrent.";
            };
            # Blocklist
            blocklist-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable blocklist.";
            };
            blocklist-url = mkOption {
              type = types.str;
              default = "https://www.example.com/blocklist";
              description = "URL of the blocklist to use.";
            };
            # Files and Locations
            download-dir = mkOption {
              type = types.path;
              default = "/Users/${user.username}/Downloads";
              description = "Directory where to download torrents.";
            };
            incomplete-dir = mkOption {
              type = types.path;
              default = "/Users/${user.username}/Downloads/incomplete";
              description = "Directory to keep files in until torrent is complete.";
            };
            incomplete-dir-enabled = mkOption {
              type = types.bool;
              default = true;
              description = "When enabled, new torrents will download the files to `incomplete-dir`. When complete, the files will be moved to `download-dir`.";
            };
            preallocation = mkOption {
              type = types.ints.between 0 2;
              default = 1;
              description = "File preallocation mode (0 = Off, 1 = Fast, 2 = Full).";
            };
            rename-partial-files = mkOption {
              type = types.bool;
              default = true;
              description = "Postfix partially downloaded files with \".part\".";
            };
            start-added-torrents = mkOption {
              type = types.bool;
              default = true;
              description = "Start torrents as soon as they are added.";
            };
            trash-can-enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Whether to move the torrents to the system's trashcan or unlink them right away upon deletion from Transmission.";
            };
            trash-original-torrent-files = mkOption {
              type = types.bool;
              default = false;
              description = "Delete torrents added from the watch directory.";
            };
            umask = mkOption {
              type = types.str;
              default = "022";
              description = "Sets Transmission's file mode creation mask.";
            };
            watch-dir = mkOption {
              type = types.path;
              default = "/Users/${user.username}/Downloads/torrents";
              description = "Watch a directory for torrent files and add them to transmission.";
            };
            watch-dir-enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Watch a directory for torrent files and add them to Transmission.";
            };
            watch-dir-force-generic = mkOption {
              type = types.bool;
              default = false;
              description = "Force to use a watch directory implementation that does not rely on OS-specific mechanisms. Useful when your watch directory is on a network location, such as CIFS or NFS.";
            };
            # Peer Settings
            peer-port = mkOption {
              type = types.port;
              default = 51413;
              description = "Port to listen for incoming peer connections.";
            };
            peer-port-random-on-start = mkOption {
              type = types.bool;
              default = false;
              description = "Randomize peer port on start.";
            };
            peer-port-random-low = mkOption {
              type = types.port;
              default = 1024;
              description = "Low end of random peer port range.";
            };
            peer-port-random-high = mkOption {
              type = types.port;
              default = 65535;
              description = "High end of random peer port range.";
            };
            port-forwarding-enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable UPnP or NAT-PMP port forwarding.";
            };
            peer-limit-global = mkOption {
              type = types.int;
              default = 200;
              description = "Global maximum number of peers.";
            };
            peer-limit-per-torrent = mkOption {
              type = types.int;
              default = 50;
              description = "Maximum number of peers per torrent.";
            };
            bind-address-ipv4 = mkOption {
              type = types.str;
              default = "";
              description = "Where to listen for peer connections. Empty string binds to \"0.0.0.0\".";
            };
            bind-address-ipv6 = mkOption {
              type = types.str;
              default = "";
              description = "Where to listen for IPv6 peer connections.";
            };

            # Protocol Settings
            dht-enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable Distributed Hash Table (DHT).";
            };
            lpd-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable Local Peer Discovery (LPD).";
            };
            pex-enabled = mkOption {
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
            rpc-enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable RPC interface.";
            };
            rpc-bind-address = mkOption {
              type = types.str;
              default = "127.0.0.1";
              description = "Where to listen for RPC connections. Use \"0.0.0.0\" to listen on all interfaces.";
            };
            rpc-port = mkOption {
              type = types.port;
              default = 9091;
              description = "The RPC port to listen on.";
            };
            rpc-url = mkOption {
              type = types.str;
              default = "/transmission/";
              description = "URL path for the RPC interface.";
            };
            rpc-authentication-required = mkOption {
              type = types.bool;
              default = false;
              description = "Require authentication for RPC connections.";
            };
            rpc-username = mkOption {
              type = types.str;
              default = "";
              description = "Username for RPC authentication.";
            };
            rpc-password = mkOption {
              type = types.str;
              default = "";
              description = "Password for RPC authentication. Can be plaintext (will be salted on startup).";
            };
            rpc-whitelist-enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable RPC IP whitelist.";
            };
            rpc-whitelist = mkOption {
              type = types.str;
              default = "127.0.0.1";
              description = "Comma-delimited list of IP addresses allowed for RPC. Wildcards allowed using '*'.";
            };
            rpc-host-whitelist-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable RPC host whitelist.";
            };
            rpc-host-whitelist = mkOption {
              type = types.str;
              default = "";
              description = "Comma-delimited list of domain names allowed for RPC. Wildcards allowed using '*'.";
            };
            anti-brute-force-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable brute force protection for the RPC server.";
            };
            anti-brute-force-threshold = mkOption {
              type = types.int;
              default = 100;
              description = "Number of failed authentication attempts before denying further attempts.";
            };

            # Queuing
            download-queue-enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Enable download queue.";
            };
            download-queue-size = mkOption {
              type = types.int;
              default = 5;
              description = "Maximum number of torrents to download at once.";
            };
            seed-queue-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable seed queue.";
            };
            seed-queue-size = mkOption {
              type = types.int;
              default = 10;
              description = "Maximum number of torrents to seed at once.";
            };
            queue-stalled-enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Consider torrents stalled after queue-stalled-minutes of inactivity.";
            };
            queue-stalled-minutes = mkOption {
              type = types.int;
              default = 30;
              description = "Minutes of inactivity before a torrent is considered stalled.";
            };

            # Ratio and Idle Limits
            ratio-limit = mkOption {
              type = types.float;
              default = 2.0;
              description = "Seed ratio limit.";
            };
            ratio-limit-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable seed ratio limit.";
            };
            idle-seeding-limit = mkOption {
              type = types.int;
              default = 30;
              description = "Stop seeding after being idle for N minutes.";
            };
            idle-seeding-limit-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Enable idle seeding limit.";
            };

            # Misc
            message-level = mkOption {
              type = types.ints.between 0 6;
              default = 4;
              description = "Log verbosity (0 = None, 1 = Critical, 2 = Error, 3 = Warn, 4 = Info, 5 = Debug, 6 = Trace).";
            };
            cache-size-mib = mkOption {
              type = types.int;
              default = 4;
              description = "Memory cache size in MiB.";
            };
            scrape-paused-torrents-enabled = mkOption {
              type = types.bool;
              default = true;
              description = "Scrape paused torrents.";
            };

            # Scripts
            script-torrent-added-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Run a script when a torrent is added.";
            };
            script-torrent-added-filename = mkOption {
              type = types.str;
              default = "";
              description = "Path to script to run when a torrent is added.";
            };
            script-torrent-done-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Run a script when a torrent finishes downloading.";
            };
            script-torrent-done-filename = mkOption {
              type = types.str;
              default = "";
              description = "Path to script to run when a torrent finishes downloading.";
            };
            script-torrent-done-seeding-enabled = mkOption {
              type = types.bool;
              default = false;
              description = "Run a script when a torrent finishes seeding.";
            };
            script-torrent-done-seeding-filename = mkOption {
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
      mkdir -p '${cfg.settings.download-dir}' && chown -R '${user.username}' '${cfg.settings.download-dir}'
      mkdir -p '${cfg.settings.incomplete-dir}' && chown -R '${user.username}' '${cfg.settings.incomplete-dir}'
      mkdir -p '${cfg.settings.watch-dir}' && chown -R '${user.username}' '${cfg.settings.watch-dir}'
    '';

    launchd.user.agents.transmission = {
      serviceConfig = {
        Label = "com.transmissionbt.daemon";
        EnvironmentVariables = {
          # Use the kebab-case configuration format
          TR_SAVE_VERSION_FORMAT = "4";
        };
        ProgramArguments =
          [
            "${cfg.package}/bin/transmission-daemon"
            "--foreground"
            "--config-dir"
            "${cfg.configDir}"
            "--logfile"
            "${cfg.logDir}/transmission.log"
            "--no-auth"
            "--log-level"
            "debug"
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
        # Increase file descriptor limits to prevent "Too many open files" errors
        SoftResourceLimits.NumberOfFiles = 8192;
        HardResourceLimits.NumberOfFiles = 65535;
      };
    };
    # Make transmission CLI tools available in PATH
    environment.systemPackages = [cfg.package];
  };
}
