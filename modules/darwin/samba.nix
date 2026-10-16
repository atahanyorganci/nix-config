{
  flake.modules.darwin.samba = {
    config,
    lib,
    pkgs,
    ...
  }: let
    cfg = config.samba;
    inherit
      (lib)
      concatStrings
      concatStringsSep
      escapeShellArg
      filterAttrs
      isBool
      isList
      literalExpression
      mapAttrs
      mapAttrsToList
      mkDefault
      mkEnableOption
      mkIf
      mkMerge
      mkOption
      mkPackageOption
      optionalAttrs
      types
      ;

    smbd = "${cfg.package}/bin/smbd";
    smbpasswd = "${cfg.package}/bin/smbpasswd";
    pdbedit = "${cfg.package}/bin/pdbedit";

    # Where this module records that it turned Apple's File Sharing (SMB)
    # off, so disabling the module turns it back on, and the smbd binary
    # last granted Full Disk Access.
    stateDir = "/var/lib/samba";
    appleSmbdMarker = "${stateDir}/.nix-disabled-apple-smbd";
    tccMarker = "${stateDir}/.nix-smbd-binary";

    settingValue = types.oneOf [types.str types.int types.bool (types.listOf types.str)];

    renderValue = value:
      if isBool value
      then
        (
          if value
          then "yes"
          else "no"
        )
      else if isList value
      then concatStringsSep " " value
      else toString value;

    renderSection = name: settings:
      "[${name}]\n"
      + concatStrings (mapAttrsToList (key: value: "  ${key} = ${renderValue value}\n")
        (filterAttrs (_: value: value != null) settings));

    shareSettings = share:
      {
        inherit (share) path browseable;
        "read only" = share.readOnly;
        "guest ok" = false;
      }
      // optionalAttrs (share.comment != null) {inherit (share) comment;}
      // optionalAttrs (share.validUsers != []) {"valid users" = share.validUsers;}
      // optionalAttrs (share.writeList != []) {"write list" = share.writeList;}
      // optionalAttrs share.timeMachine.enable ({
          "fruit:time machine" = true;
          # Time Machine relies on durable handles; macOS has no kernel
          # oplocks or share modes for Samba to honour anyway.
          "durable handles" = true;
          "kernel oplocks" = false;
          "kernel share modes" = false;
          "posix locking" = false;
        }
        // optionalAttrs (share.timeMachine.maxSize != null) {
          "fruit:time machine max size" = share.timeMachine.maxSize;
        })
      // share.settings;

    rawConfig = pkgs.writeText "smb.conf" (
      concatStringsSep "\n" (
        [(renderSection "global" cfg.settings)]
        ++ mapAttrsToList (name: share: renderSection name (shareSettings share)) cfg.shares
      )
    );

    # Validate with testparm, so a typo or malformed value fails the build
    # instead of smbd at startup.
    configFile =
      pkgs.runCommand "smb.conf" {
        nativeBuildInputs = [cfg.package];
      } ''
        # The runtime directories only exist on the host.
        mkdir -p dirs/{lock,state,cache,pid}
        testparm --suppress-prompt --debuglevel=1 \
          --option="lock directory=$PWD/dirs/lock" \
          --option="state directory=$PWD/dirs/state" \
          --option="cache directory=$PWD/dirs/cache" \
          --option="pid directory=$PWD/dirs/pid" \
          ${rawConfig} >/dev/null 2>testparm.log || {
          cat testparm.log >&2
          exit 1
        }
        # testparm only warns about unknown parameters.
        if grep -q "Unknown parameter encountered" testparm.log; then
          cat testparm.log >&2
          exit 1
        fi
        cp ${rawConfig} $out
      '';

    shareModule = {
      options = {
        path = mkOption {
          type = types.str;
          example = "/Volumes/Media/Videos";
          description = "Directory to share.";
        };
        comment = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = "Description shown to clients.";
        };
        readOnly = mkOption {
          type = types.bool;
          default = true;
          description = "Share read-only; `writeList` users may still write.";
        };
        browseable = mkOption {
          type = types.bool;
          default = true;
          description = "List the share when clients browse the server.";
        };
        validUsers = mkOption {
          type = types.listOf types.str;
          default = [];
          example = ["alice" "@staff"];
          description = "Users (or `@groups`) allowed to connect. Empty allows every Samba user.";
        };
        writeList = mkOption {
          type = types.listOf types.str;
          default = [];
          example = ["alice"];
          description = "Users (or `@groups`) granted write access even when `readOnly` is set.";
        };
        timeMachine = {
          enable = mkEnableOption "use as a Time Machine destination (advertised over Bonjour)";
          maxSize = mkOption {
            type = types.nullOr types.str;
            default = null;
            example = "1T";
            description = "Size Time Machine may use on this share (`fruit:time machine max size`).";
          };
        };
        settings = mkOption {
          type = types.attrsOf settingValue;
          default = {};
          example = {"veto files" = "/.DS_Store/";};
          description = "Extra smb.conf parameters for this share.";
        };
      };
    };

    userModule = {
      options.passwordFile = mkOption {
        type = types.str;
        example = "/var/lib/samba-passwords/alice";
        description = ''
          File holding the user's SMB password, kept outside the Nix store.
          It is read on every activation; the user must also exist as a
          macOS account.
        '';
      };
    };

    declaredUsers = " ${concatStringsSep " " (builtins.attrNames cfg.users)} ";
  in {
    options.samba = {
      enable = mkEnableOption "the Samba SMB server, replacing Apple's File Sharing (SMB)";
      package = mkPackageOption pkgs "samba" {};

      hostsAllow = mkOption {
        type = types.listOf types.str;
        default = ["127.0.0.1"];
        example = ["127.0.0.1" "192.168.1.0/24" "100.64.0.0/10"];
        description = ''
          Addresses and networks allowed to connect (`hosts allow`); every
          other host is refused.
        '';
      };

      bonjour = {
        enable = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Advertise the server, its Finder icon and any Time Machine shares
            over Bonjour.
          '';
        };
        name = mkOption {
          type = types.enum ["computer" "netbios"];
          default = "computer";
          description = ''
            Name to advertise: the Mac's computer name (`scutil --get
            ComputerName`), or Samba's upper-cased NetBIOS name.
          '';
        };
        model = mkOption {
          type = types.str;
          default = "MacSamba";
          example = "MacPro7,1@ECOLOR=226,226,224";
          description = "Device model Finder uses to pick the server's icon (`fruit:model`).";
        };
      };

      users = mkOption {
        type = types.attrsOf (types.submodule userModule);
        default = {};
        description = ''
          Samba accounts, keyed by macOS user name. Accounts in Samba's
          database that are not listed here are removed.
        '';
      };

      shares = mkOption {
        type = types.attrsOf (types.submodule shareModule);
        default = {};
        description = "Shares, keyed by the name clients see.";
      };

      settings = mkOption {
        type = types.attrsOf settingValue;
        default = {};
        description = "Global smb.conf parameters, merged over the module's defaults.";
      };

      configFile = mkOption {
        type = types.path;
        readOnly = true;
        default = configFile;
        defaultText = literalExpression "generated smb.conf";
        description = "The generated (and testparm-validated) smb.conf.";
      };
    };

    config = mkMerge [
      (mkIf cfg.enable {
        samba.settings = mapAttrs (_: mkDefault) {
          "server role" = "standalone server";
          "server string" = config.networking.hostName;
          "netbios name" = config.networking.hostName;
          # SMB over TCP 445 only: no nmbd, no NetBIOS browsing.
          "disable netbios" = true;
          "smb ports" = "445";
          "server min protocol" = "SMB2_10";

          "hosts allow" = cfg.hostsAllow;
          "map to guest" = "Never";
          "restrict anonymous" = 2;
          "passdb backend" = "tdbsam";

          "multicast dns register" = cfg.bonjour.enable;
          "mdns name" =
            if cfg.bonjour.name == "computer"
            then "mdns"
            else "netbios";

          # Behave like a Mac server for Finder and Time Machine: Apple SMB
          # extensions, resource forks and Finder info kept in streams, and
          # characters that are illegal on Windows mapped back to Mac ones.
          "vfs objects" = ["catia" "fruit" "streams_xattr"];
          "fruit:metadata" = "stream";
          "fruit:model" = cfg.bonjour.model;
          "fruit:wipe_intentionally_left_blank_rfork" = true;
          "fruit:delete_empty_adfiles" = true;
          # Samba has no ACL support on macOS.
          "fruit:nfs_aces" = false;
          # Spotlight on Samba needs Tracker or Elasticsearch.
          "spotlight" = false;

          "load printers" = false;
          "printing" = "bsd";
          "printcap name" = "/dev/null";
          "disable spoolss" = true;

          "logging" = "file";
          "log file" = "/var/log/samba/log.%m";
          "max log size" = 1000;
        };

        assertions = [
          {
            assertion = cfg.shares != {};
            message = "samba.enable requires at least one entry in samba.shares.";
          }
          {
            assertion = cfg.hostsAllow != [];
            message = "samba.hostsAllow must not be empty.";
          }
        ];

        environment.systemPackages = [cfg.package];
        # Samba's tools (smbpasswd, pdbedit, smbstatus, testparm) read this.
        environment.etc."samba/smb.conf".source = configFile;

        # Runs before nix-darwin loads launchd daemons, so port 445 is free
        # by the time smbd starts.
        system.activationScripts.extraActivation.text = ''
          echo "Preparing Samba..."
          mkdir -p ${stateDir}/private /var/lock/samba /var/cache/samba /var/log/samba
          chmod 0700 ${stateDir}/private

          # Apple's smbd holds TCP 445 through a launchd socket.
          if ! launchctl print-disabled system | grep -q '"com.apple.smbd" => disabled'; then
            echo "Turning off Apple File Sharing (SMB)..."
            launchctl disable system/com.apple.smbd
            touch ${appleSmbdMarker}
          fi
          launchctl bootout system/com.apple.smbd 2>/dev/null || true
        '';

        # After nix-darwin created users and installed /etc/samba/smb.conf.
        system.activationScripts.postActivation.text = ''
          echo "Configuring Samba users..."
          ${concatStrings (mapAttrsToList (name: user: ''
              if ! id -u ${escapeShellArg name} >/dev/null 2>&1; then
                echo "warning: samba user ${name} has no macOS account, skipping" >&2
              elif [ ! -s ${escapeShellArg user.passwordFile} ]; then
                echo "warning: samba password file ${user.passwordFile} is missing, ${name} cannot log in" >&2
              else
                password="$(head -n 1 ${escapeShellArg user.passwordFile})"
                printf '%s\n%s\n' "$password" "$password" \
                  | ${smbpasswd} -c ${configFile} -s -a ${escapeShellArg name} >/dev/null
                unset password
              fi
            '')
            cfg.users)}
          declared=${escapeShellArg declaredUsers}
          ${pdbedit} -s ${configFile} -L 2>/dev/null | cut -d: -f1 | while read -r name; do
            case "$declared" in
              *" $name "*) ;;
              *)
                echo "Removing samba user $name..."
                ${pdbedit} -s ${configFile} -x -u "$name" >/dev/null
                ;;
            esac
          done

          # TCC ties Full Disk Access to the binary, so every new smbd needs
          # it granted again before it can read protected folders and
          # external volumes.
          if [ "$(cat ${tccMarker} 2>/dev/null)" != ${escapeShellArg smbd} ]; then
            echo "warning: grant Full Disk Access to ${smbd}" >&2
            echo "  (System Settings > Privacy & Security > Full Disk Access, then" >&2
            echo "   sudo launchctl kickstart -k system/${config.launchd.daemons.samba-smbd.serviceConfig.Label})" >&2
            echo ${escapeShellArg smbd} > ${tccMarker}
          fi
        '';

        launchd.daemons.samba-smbd.serviceConfig = {
          Label = "org.samba.smbd";
          # The config path in the arguments makes nix-darwin reload the
          # daemon whenever smb.conf changes.
          ProgramArguments = [
            smbd
            "--foreground"
            "--no-process-group"
            "--configfile=${configFile}"
          ];
          RunAtLoad = true;
          KeepAlive = true;
          ThrottleInterval = 10;
          StandardOutPath = "/var/log/samba/smbd.launchd.log";
          StandardErrorPath = "/var/log/samba/smbd.launchd.log";
        };
      })
      (mkIf (!cfg.enable) {
        # Hand SMB back to Apple's File Sharing if this module took it over.
        system.activationScripts.postActivation.text = ''
          if [ -e ${appleSmbdMarker} ]; then
            echo "Turning Apple File Sharing (SMB) back on..."
            launchctl enable system/com.apple.smbd
            launchctl bootstrap system /System/Library/LaunchDaemons/com.apple.smbd.plist 2>/dev/null || true
            rm -f ${appleSmbdMarker}
          fi
        '';
      })
    ];
  };
}
