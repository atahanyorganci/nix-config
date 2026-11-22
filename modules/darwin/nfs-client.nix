# macOS NFS client settings (/etc/nfs.conf, see nfs.conf(5)), and NFS shares
# mounted by macOS's automounter (auto_master(5)).
#
# macOS ships /etc/nfs.conf with nothing but a comment header and
# /etc/auto_master with its stock maps, so nix-darwin may replace each only
# while it still has that content: the hashes below are of the stock files.
# If a macOS update ships different ones, activation stops with "Unexpected
# files in /etc"; check the new file and add its hash.
#
# Automounts:
# - The automounter mounts a share when something first touches its path and
#   unmounts it when idle, so a share that dropped (NAS restart, network)
#   comes back on the next access. No mount service of our own.
# - A direct map's mount point must already exist, on the writable data
#   volume (`/System/Volumes/Data/...`); `/Volumes` is unsuitable, as macOS
#   clears empty folders there at boot.
# - With `sec=krb5`, the mount uses the Kerberos tickets of the login session
#   that triggered it (tickets are per session on macOS, not per user): in
#   practice the GUI session, where the ticket agent and the services run.
# - macOS guards /etc/auto_master as an administration file: activate over
#   SSH (sshd has Full Disk Access), not from a session lacking it.
{
  flake.modules.darwin.nfs-client = {
    config,
    lib,
    ...
  }: let
    cfg = config.nfsClient;
    inherit
      (lib)
      concatStrings
      concatStringsSep
      escapeShellArg
      hasPrefix
      mapAttrsToList
      mkEnableOption
      mkIf
      mkMerge
      mkOption
      optionalAttrs
      types
      ;

    renderValue = value:
      if builtins.isBool value
      then
        (
          if value
          then "1"
          else "0"
        )
      else toString value;

    settings =
      optionalAttrs (cfg.nfs4Domain != null) {
        "nfs.client.default_nfs4domain" = cfg.nfs4Domain;
      }
      // cfg.settings;

    # Apple's /etc/auto_master, byte for byte (tabs included); its hash is
    # `stockAutoMasterSha256`.
    stockAutoMaster = ''
      #
      # Automounter master map
      #
      +auto_master		# Use directory service
      #/net			-hosts		-nobrowse,hidefromfinder,nosuid
      /home			auto_home	-nobrowse,hidefromfinder
      /Network/Servers	-fstab
      /-			-static
    '';

    mapName = "auto_nix";

    automountModule = {...}: {
      options = {
        mountPoint = mkOption {
          type = types.str;
          example = "/System/Volumes/Data/nas/media";
          description = ''
            Where the share appears. Created by activation; must be on the
            data volume (`/System/Volumes/Data/...`).
          '';
        };
        source = mkOption {
          type = types.str;
          example = "nas.local:/volume1/Media";
          description = "NFS source, `host:/export`.";
        };
        options = mkOption {
          type = types.listOf types.str;
          default = [];
          example = ["vers=4.1" "sec=krb5" "resvport" "hard" "intr" "nfc"];
          description = "mount_nfs(8) options; `nobrowse` is added.";
        };
      };
      config.options = lib.mkAfter ["nobrowse"];
    };
  in {
    options.nfsClient = {
      enable = mkEnableOption "managed NFS client settings in /etc/nfs.conf";

      nfs4Domain = mkOption {
        type = types.nullOr types.str;
        default = null;
        example = "example.com";
        description = ''
          NFSv4 ID-mapping domain (`nfs.client.default_nfs4domain`). Must match
          the server's NFSv4 domain, or file owners show up as nobody.
        '';
      };

      settings = mkOption {
        type = types.attrsOf (types.oneOf [types.str types.int types.bool]);
        default = {};
        example = {"nfs.client.mount.options" = "vers=4.1";};
        description = "Further `nfs.conf` settings, by full key.";
      };

      automounts = mkOption {
        type = types.attrsOf (types.submodule automountModule);
        default = {};
        description = ''
          NFS shares mounted by macOS's automounter on first access, through a
          direct map (`/etc/${mapName}`) included from /etc/auto_master.
        '';
      };

      stockSha256 = mkOption {
        type = types.listOf types.str;
        default = ["933a32202a6ca9d47c1a0af25f8577369b0134ce749002de1228f2b23a909142"];
        description = "Hashes of Apple's stock /etc/nfs.conf that nix-darwin may replace.";
      };

      stockAutoMasterSha256 = mkOption {
        type = types.listOf types.str;
        default = ["b2aac03248e8f229c703561f5bb059f9be491e5db9f447692398d775a9fb12a5"];
        description = "Hashes of Apple's stock /etc/auto_master that nix-darwin may replace.";
      };
    };

    config = mkIf cfg.enable (mkMerge [
      {
        environment.etc."nfs.conf" = {
          text =
            ''
              #
              # nfs.conf: the NFS configuration file (managed by nix-darwin)
              #
            ''
            + concatStrings (mapAttrsToList (key: value: "${key} = ${renderValue value}\n") settings);
          knownSha256Hashes = cfg.stockSha256;
        };
      }

      (mkIf (cfg.automounts != {}) {
        assertions =
          mapAttrsToList (name: mount: {
            assertion = hasPrefix "/System/Volumes/Data/" mount.mountPoint;
            message = "nfsClient.automounts.${name}.mountPoint must be under /System/Volumes/Data/.";
          })
          cfg.automounts;

        # Disabling the automounts puts the stock file back; disabling the
        # whole module removes it (macOS then uses only directory services).
        environment.etc."auto_master" = {
          text = stockAutoMaster + "/-\t\t\t${mapName}\t-nosuid\n";
          knownSha256Hashes = cfg.stockAutoMasterSha256;
        };

        environment.etc.${mapName}.text =
          concatStrings (mapAttrsToList (_: mount: "${mount.mountPoint}\t-fstype=nfs,${concatStringsSep "," mount.options}\t${mount.source}\n")
            cfg.automounts);

        # Before launchd starts services that touch the shares. Once the
        # automounter has its trigger (and maybe the share) there, the path
        # must not be touched: looking at a Kerberos share from a session
        # without a ticket (the activating SSH session) fails. So the mount
        # table decides.
        system.activationScripts.extraActivation.text = ''
          echo "Creating NFS automount points..."
          ${concatStrings (mapAttrsToList (_: mount: ''
              if ! /sbin/mount | grep -qF ${escapeShellArg " on ${mount.mountPoint} ("}; then
                mkdir -p ${escapeShellArg mount.mountPoint}
              fi
            '')
            cfg.automounts)}
        '';

        # After /etc is linked: have automountd read the new maps.
        system.activationScripts.postActivation.text = ''
          echo "Reloading the automounter..."
          /usr/sbin/automount -c >/dev/null || echo "warning: automount -c failed" >&2
        '';
      })
    ]);
  };
}
