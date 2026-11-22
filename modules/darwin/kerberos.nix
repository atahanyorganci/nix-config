# A Kerberos KDC for this host alone, so it can get tickets for NFS shares
# that require Kerberos (`sec=krb5`) without a realm server elsewhere.
#
# - The KDC (MIT krb5kdc from nixpkgs) listens on loopback only. Port 88 is
#   taken by Apple's own Heimdal KDC (the "Local KDC" behind Screen Sharing
#   and file-sharing sign-in), which this leaves alone.
# - A file server never asks the KDC anything: it checks tickets with its own
#   keytab. So the NAS only needs the keytab this host exports once.
# - Every principal's key derives from its password (sops) and the realm, so
#   the database is disposable: recreated from the same passwords, the keys,
#   and so the keytab imported into the NAS, stay the same. The master key is
#   only a local encryption key and need not be stable.
# - Tickets are fetched with Apple's /usr/bin/kinit, not MIT's: the NFS
#   client's gssd reads macOS's own credential caches, which MIT's file-based
#   cache is not. Apple's Kerberos only parses the realm block of krb5.conf
#   when it spans several lines.
{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.darwin.kerberos = {
    config,
    lib,
    pkgs,
    user,
    ...
  }: let
    cfg = config.kerberos;
    inherit
      (lib)
      concatStrings
      escapeShellArg
      filterAttrs
      literalExpression
      mapAttrs'
      mapAttrsToList
      mkEnableOption
      mkIf
      mkMerge
      mkOption
      mkPackageOption
      nameValuePair
      optionalString
      replaceStrings
      types
      ;

    kdcAddress = "127.0.0.1:${toString cfg.port}";
    keytabDir = "${cfg.stateDir}/keytabs";
    logFile = "/var/log/krb5kdc-local.log";
    kdcLabel = "dev.yorganci.krb5kdc";

    kdcConf = pkgs.writeText "kdc.conf" ''
      [kdcdefaults]
        kdc_listen = ${kdcAddress}
        kdc_tcp_listen = ${kdcAddress}

      [realms]
        ${cfg.realm} = {
          database_name = ${cfg.stateDir}/principal
          key_stash_file = ${cfg.stateDir}/.k5.${cfg.realm}
          max_life = ${cfg.ticketLifetime}
          max_renewable_life = ${cfg.renewableLifetime}
          master_key_type = aes256-cts-hmac-sha1-96
          supported_enctypes = aes256-cts-hmac-sha1-96:normal
        }

      [logging]
        kdc = STDERR
        default = STDERR
    '';

    # For the KDC and kadmin.local (MIT); clients use /etc/krb5.conf.
    kdcKrb5Conf = pkgs.writeText "krb5.conf" ''
      [libdefaults]
        default_realm = ${cfg.realm}
        dns_lookup_kdc = false
        dns_lookup_realm = false

      [realms]
        ${cfg.realm} = {
          kdc = ${kdcAddress}
        }
    '';

    kdcEnv = {
      KRB5_CONFIG = "${kdcKrb5Conf}";
      KRB5_KDC_PROFILE = "${kdcConf}";
    };

    kadminLocal = pkgs.writeShellScriptBin "krb5-local-kadmin" ''
      # kadmin.local for this host's KDC; reads the database, so run it as root.
      export KRB5_CONFIG=${kdcKrb5Conf} KRB5_KDC_PROFILE=${kdcConf}
      exec ${cfg.package}/bin/kadmin.local -r ${escapeShellArg cfg.realm} "$@"
    '';

    keytabFileName = name: "${replaceStrings ["/" "@"] ["_" "_"] name}.keytab";

    principalModule = {name, ...}: {
      options = {
        passwordFile = mkOption {
          type = types.str;
          example = literalExpression ''config.sops.secrets."kerberos/immich".path'';
          description = ''
            File holding the principal's password (outside the Nix store), from
            which its key derives. Read when the principal is created; changing
            it later does not change an existing key. The password must not
            contain whitespace or quotes.
          '';
        };
        keytab = {
          owner = mkOption {
            type = types.nullOr types.str;
            default = null;
            example = "atahan";
            description = ''
              Export the principal's key to a keytab this user may read (mode
              0400), refreshed on every activation. Null exports nothing.
            '';
          };
          path = mkOption {
            type = types.str;
            readOnly = true;
            default = "${keytabDir}/${keytabFileName name}";
            defaultText = literalExpression ''"''${stateDir}/keytabs/<principal>.keytab"'';
            description = "Where the keytab is written.";
          };
        };
      };
    };

    ticketModule = {name, ...}: {
      options = {
        principal = mkOption {
          type = types.str;
          default = name;
          description = "Principal (without the realm) whose ticket to keep; it needs a keytab.";
        };
        user = mkOption {
          type = types.str;
          default = "root";
          example = "atahan";
          description = ''
            Account that holds the ticket. `root` runs a launchd daemon, for
            mounts; any other value a launchd agent in that user's GUI session,
            so processes in the session (e.g. other agents) share the ticket.
          '';
        };
        interval = mkOption {
          type = types.ints.positive;
          default = 3600;
          description = "Seconds between renewals; well below `ticketLifetime`.";
        };
      };
    };

    keytabOf = ticket: cfg.principals.${ticket.principal}.keytab.path;

    kinitArgs = ticket: [
      "/usr/bin/kinit"
      "-k"
      "-t"
      (keytabOf ticket)
      "${ticket.principal}@${cfg.realm}"
    ];

    ticketLabel = name: "dev.yorganci.krb5-ticket.${name}";

    rootTickets = filterAttrs (_: t: t.user == "root") cfg.tickets;
    userTickets = filterAttrs (_: t: t.user != "root") cfg.tickets;

    ensurePrincipal = name: principal: ''
      if [ ! -s ${escapeShellArg principal.passwordFile} ]; then
        echo "warning: kerberos: password file for ${name} is missing, skipping" >&2
      else
        if ! ${kadminLocal}/bin/krb5-local-kadmin -q ${escapeShellArg "getprinc ${name}"} 2>/dev/null | grep -q '^Principal: '; then
          echo "Creating Kerberos principal ${name}@${cfg.realm}..."
          # The password reaches kadmin.local on stdin, never in argv.
          printf 'addprinc -pw %s %s\n' "$(head -n 1 ${escapeShellArg principal.passwordFile})" ${escapeShellArg name} \
            | ${kadminLocal}/bin/krb5-local-kadmin >/dev/null
        fi
        ${optionalString (principal.keytab.owner != null) ''
        # ktadd appends to an existing file, so export into a fresh one.
        tmp="$(mktemp -u ${keytabDir}/.ktadd.XXXXXX)"
        ${kadminLocal}/bin/krb5-local-kadmin -q "ktadd -norandkey -k $tmp ${name}" >/dev/null
        install -m 0400 -o ${escapeShellArg principal.keytab.owner} "$tmp" ${escapeShellArg principal.keytab.path}
        rm -f "$tmp"
      ''}
      fi
    '';
  in {
    options.kerberos = {
      enable = mkEnableOption "a loopback-only Kerberos KDC that mints this host's own tickets";
      package = mkPackageOption pkgs "krb5" {};

      realm = mkOption {
        type = types.str;
        default = lib.toUpper infra.domain;
        defaultText = literalExpression "lib.toUpper infra.domain";
        description = "Kerberos realm. Part of every key: renaming it changes all keys.";
      };

      port = mkOption {
        type = types.port;
        default = 8888;
        description = "Loopback port of the KDC (88 belongs to Apple's KDC).";
      };

      stateDir = mkOption {
        type = types.str;
        default = "/var/lib/krb5kdc-local";
        description = "Database, stash and exported keytabs (root only, except keytabs).";
      };

      masterPasswordFile = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          Master password for a new database. Null generates a random one: the
          database is disposable (keys derive from principal passwords), so
          the master key need not survive it.
        '';
      };

      ticketLifetime = mkOption {
        type = types.str;
        default = "10h 0m 0s";
        description = "Maximum ticket lifetime (`max_life`).";
      };

      renewableLifetime = mkOption {
        type = types.str;
        default = "7d 0h 0m 0s";
        description = "Maximum renewable lifetime (`max_renewable_life`).";
      };

      principals = mkOption {
        type = types.attrsOf (types.submodule principalModule);
        default = {};
        example = literalExpression ''
          {
            "nfs/nas.example.com".passwordFile = config.sops.secrets."kerberos/nfs-nas".path;
            immich = {
              passwordFile = config.sops.secrets."kerberos/immich".path;
              keytab.owner = "alice";
            };
          }
        '';
        description = ''
          Principals (without the realm) to create when missing. Principals in
          the database that are not listed are left alone.
        '';
      };

      tickets = mkOption {
        type = types.attrsOf (types.submodule ticketModule);
        default = {};
        description = "Tickets kept fresh with Apple's kinit and the principal's keytab.";
      };
    };

    config = mkIf cfg.enable (mkMerge [
      {
        assertions =
          mapAttrsToList (name: _: {
            # Names reach kadmin.local's command line unquoted.
            assertion = builtins.match "[A-Za-z0-9._/-]+" name != null;
            message = "kerberos.principals.\"${name}\": use letters, digits and . _ / - only.";
          })
          cfg.principals
          ++ mapAttrsToList (name: ticket: {
            assertion = cfg.principals ? ${ticket.principal} && cfg.principals.${ticket.principal}.keytab.owner != null;
            message = "kerberos.tickets.${name}: principal ${ticket.principal} needs an entry in kerberos.principals with keytab.owner set.";
          })
          cfg.tickets
          ++ mapAttrsToList (name: ticket: {
            assertion = ticket.user == "root" || ticket.user == user.username;
            message = "kerberos.tickets.${name}: launchd agents run in the primary user's session; use root or ${user.username}.";
          })
          cfg.tickets
          ++ mapAttrsToList (name: ticket: {
            assertion = let
              owner = cfg.principals.${ticket.principal}.keytab.owner or null;
            in
              ticket.user == "root" || owner == ticket.user;
            message = "kerberos.tickets.${name}: ${ticket.user} cannot read the keytab of ${ticket.principal} (keytab.owner).";
          })
          cfg.tickets;

        environment.systemPackages = [kadminLocal];

        # Apple's Kerberos (kinit, gssd) reads this. Only the realm is
        # declared, so Apple's own realms and defaults are left as they are.
        environment.etc."krb5.conf".text = ''
          [realms]
            ${cfg.realm} = {
              kdc = ${kdcAddress}
            }
        '';

        # `command` waits for the Nix store volume (`/bin/wait4path`): at
        # boot launchd starts daemons before it is mounted.
        launchd.daemons.krb5kdc-local.command = lib.escapeShellArgs ["${cfg.package}/bin/krb5kdc" "-n" "-r" cfg.realm];
        launchd.daemons.krb5kdc-local.serviceConfig = {
          Label = kdcLabel;
          # The config files are in EnvironmentVariables, so nix-darwin
          # reloads the KDC whenever they change.
          EnvironmentVariables = kdcEnv;
          RunAtLoad = true;
          KeepAlive = true;
          ThrottleInterval = 10;
          StandardOutPath = logFile;
          StandardErrorPath = logFile;
        };

        # After sops-nix (`mkAfter`, priority 1500) installed the passwords.
        system.activationScripts.postActivation.text = lib.mkOrder 1600 ''
          echo "Setting up the local Kerberos KDC (${cfg.realm})..."
          # Searchable, not listable: keytab owners must reach keytabs/, while
          # kdb5_util keeps the database and stash themselves root-only (0600).
          install -d -m 0711 -o root -g wheel ${escapeShellArg cfg.stateDir}
          install -d -m 0711 -o root -g wheel ${escapeShellArg keytabDir}
          if [ ! -e ${escapeShellArg "${cfg.stateDir}/principal"} ]; then
            echo "Creating the Kerberos database..."
            master="${
            if cfg.masterPasswordFile == null
            then "$(/usr/bin/openssl rand -base64 32)"
            else "$(head -n 1 ${escapeShellArg cfg.masterPasswordFile})"
          }"
            # kdb5_util asks for the master key twice; stdin keeps it out of argv.
            printf '%s\n%s\n' "$master" "$master" \
              | env KRB5_CONFIG=${kdcKrb5Conf} KRB5_KDC_PROFILE=${kdcConf} \
                ${cfg.package}/bin/kdb5_util -r ${escapeShellArg cfg.realm} create -s >/dev/null
            unset master
            launchctl kickstart -k system/${kdcLabel} 2>/dev/null || true
          fi
          ${concatStrings (mapAttrsToList ensurePrincipal cfg.principals)}
          # launchd ran the ticket jobs when it loaded them, before the
          # keytabs above existed; fetch the tickets now rather than in an hour.
          ${concatStrings (mapAttrsToList (name: _: ''
              launchctl kickstart system/${ticketLabel name} 2>/dev/null || true
            '')
            rootTickets)}
          ${concatStrings (mapAttrsToList (name: ticket: ''
              if uid="$(id -u ${escapeShellArg ticket.user} 2>/dev/null)"; then
                launchctl kickstart "gui/$uid/${ticketLabel name}" 2>/dev/null || true
              fi
            '')
            userTickets)}
        '';
      }

      {
        launchd.daemons = mapAttrs' (name: ticket:
          nameValuePair "krb5-ticket-${name}" {
            serviceConfig = {
              Label = ticketLabel name;
              ProgramArguments = kinitArgs ticket;
              RunAtLoad = true;
              StartInterval = ticket.interval;
              StandardOutPath = logFile;
              StandardErrorPath = logFile;
            };
          })
        rootTickets;

        launchd.user.agents = mapAttrs' (name: ticket:
          nameValuePair "krb5-ticket-${name}" {
            serviceConfig = {
              Label = ticketLabel name;
              ProgramArguments = kinitArgs ticket;
              RunAtLoad = true;
              StartInterval = ticket.interval;
              StandardOutPath = "/Users/${ticket.user}/Library/Logs/krb5-ticket-${name}.log";
              StandardErrorPath = "/Users/${ticket.user}/Library/Logs/krb5-ticket-${name}.log";
            };
          })
        userTickets;
      }
    ]);
  };
}
