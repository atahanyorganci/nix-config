{
  flake.modules.nixos.atuin-server = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.atuin-server;
    stateDir = "/var/lib/atuin";
    dbPath = "${stateDir}/atuin.db";
    snapshotDir = "${stateDir}/snapshots";
  in {
    options.atuin-server = {
      enable = lib.mkEnableOption "Atuin sync server";

      port = lib.mkOption {
        type = lib.types.port;
        default = 8890;
        description = "Port on which the Atuin server listens.";
      };

      interface = lib.mkOption {
        type = lib.types.str;
        default = "nb-wt0";
        description = "Mesh interface on which the Atuin port is reachable.";
      };

      openRegistration = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Allow new account registrations.";
      };

      accessGroups = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = ["Admin"];
        description = "NetBird groups allowed to reach the service.";
      };
    };

    config = lib.mkIf cfg.enable {
      services.atuin = {
        enable = true;
        host = "0.0.0.0";
        inherit (cfg) port openRegistration;
        database = {
          createLocally = false;
          uri = "sqlite://${dbPath}";
        };
      };

      # Static user so the snapshot job shares ownership of the database files.
      users.users.atuin = {
        isSystemUser = true;
        group = "atuin";
        home = stateDir;
      };
      users.groups.atuin = {};

      systemd.services.atuin.serviceConfig = {
        DynamicUser = lib.mkForce false;
        User = "atuin";
        Group = "atuin";
        StateDirectory = "atuin";
        StateDirectoryMode = "0750";
      };

      # Copying atuin.db directly can miss pages still in the WAL file.
      systemd.services.atuin-snapshot = {
        description = "Snapshot the Atuin SQLite database";
        after = ["atuin.service"];
        path = [pkgs.sqlite pkgs.coreutils];
        serviceConfig = {
          Type = "oneshot";
          User = "atuin";
          Group = "atuin";
          UMask = "0077";
          StateDirectory = "atuin";
          StateDirectoryMode = "0750";
        };
        script = ''
          mkdir -p ${snapshotDir}
          sqlite3 ${dbPath} ".backup '${snapshotDir}/atuin.db.tmp'"
          mv -f ${snapshotDir}/atuin.db.tmp ${snapshotDir}/atuin.db
        '';
      };

      systemd.timers.atuin-snapshot = {
        wantedBy = ["timers.target"];
        timerConfig = {
          OnCalendar = "daily";
          Persistent = true;
          RandomizedDelaySec = "1h";
        };
      };

      httpServices.atuin = {
        port = cfg.port;
        expose = {
          enable = true;
          private = true;
          inherit (cfg) accessGroups;
        };
        auth = {type = "none";};
      };

      networking.firewall.interfaces.${cfg.interface}.allowedTCPPorts = [cfg.port];
    };
  };
}
