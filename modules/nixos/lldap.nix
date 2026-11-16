{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.nixos.lldap = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.lldap;
    secret = name: config.sops.secrets.${name}.path;
    placeholder = name: config.sops.placeholder.${name};
    # Values written to nix-secrets once (see `enable`), never by a stack.
    generated = ["lldap/jwt-secret" "lldap/key-seed" infra.admin.passwordSecret];
    # HomeInfra's `postgres.roles.lldap`, written by `just store-secret`.
    postgres = ["lldap/postgres/host" "lldap/postgres/username" "lldap/postgres/password"];

    # Groups LLDAP has from the start, for its own permissions.
    builtinGroups = ["lldap_admin" "lldap_password_manager" "lldap_strict_readonly"];
    ensure = cfg.ensure.groups != [] || cfg.ensure.users != {};
    # Users whose password is kept in nix-secrets and re-applied: service accounts.
    usersWithPassword = lib.filterAttrs (_: user: user.passwordSecret != null) cfg.ensure.users;
    passwordCredential = id: "user-${id}";
    ensureSpec = pkgs.writeText "lldap-ensure.json" (builtins.toJSON {
      groups = lib.unique cfg.ensure.groups;
      users =
        lib.mapAttrsToList (id: user: {
          inherit id;
          inherit (user) email displayName;
          groups = lib.unique user.groups;
          password = user.passwordSecret != null;
        })
        cfg.ensure.users;
    });
    ensureScript = pkgs.writeShellApplication {
      name = "lldap-ensure";
      runtimeInputs = [pkgs.curl pkgs.jq config.services.lldap.package];
      # jq programs and GraphQL documents name their own `$variables`.
      excludeShellChecks = ["SC2016"];
      text = ''
        base=http://127.0.0.1:${toString cfg.httpPort}
        spec=${ensureSpec}
        headers="$RUNTIME_DIRECTORY/headers"

        # Log in as the admin. The token goes into a header file rather than
        # onto a command line; only lldap_set_password takes it as an argument.
        jq -n --rawfile password "$CREDENTIALS_DIRECTORY/admin-password" --arg username ${lib.escapeShellArg infra.admin.name} \
          '{username: $username, password: ($password | rtrimstr("\n"))}' |
          curl -fsS --retry 30 --retry-connrefused --retry-delay 1 \
            -H 'Content-Type: application/json' --data-binary @- "$base/auth/simple/login" |
          jq -r '"Authorization: Bearer " + .token' >"$headers"
        token="$(sed 's/^Authorization: Bearer //' "$headers")"

        gql() { # query, variables
          jq -n --arg query "$1" --argjson variables "$2" '{query: $query, variables: $variables}' |
            curl -fsS -H @"$headers" -H 'Content-Type: application/json' --data-binary @- "$base/api/graphql" |
            jq -e 'if .errors then error(.errors[0].message) else .data end'
        }
        groups=""
        load_groups() { groups="$(gql '{groups{id displayName}}' '{}')"; }
        group_id() { jq -r --arg name "$1" '.groups[] | select(.displayName == $name) | .id' <<<"$groups"; }

        load_groups
        while IFS= read -r group; do
          if [[ -z $(group_id "$group") ]]; then
            gql 'mutation($name: String!) { createGroup(name: $name) { id } }' "$(jq -n --arg name "$group" '{name: $name}')" >/dev/null
            echo "created group $group"
          fi
        done < <(jq -r '.groups[]' "$spec")
        load_groups

        while IFS= read -r user; do
          id="$(jq -r .id <<<"$user")"
          vars="$(jq -n --arg id "$id" '{id: $id}')"
          if ! gql 'query($id: String!) { user(userId: $id) { id } }' "$vars" >/dev/null 2>&1; then
            # Emails are unique, and LLDAP's own refusal does not say whose it is.
            email="$(jq -r .email <<<"$user")"
            owner="$(gql '{users{id email}}' '{}' | jq -r --arg email "$email" '.users[] | select(.email == $email) | .id')"
            if [[ -n $owner ]]; then
              echo "lldap-ensure: cannot create $id: $email already belongs to $owner; declare that user ID instead" >&2
              exit 1
            fi
            gql 'mutation($user: CreateUserInput!) { createUser(user: $user) { id } }' \
              "$(jq '{user: {id, email, displayName}}' <<<"$user")" >/dev/null
            echo "created user $id"
          fi
          member_of="$(gql 'query($id: String!) { user(userId: $id) { groups { displayName } } }' "$vars" | jq -r '.user.groups[].displayName')"
          while IFS= read -r group; do
            grep -qxF -- "$group" <<<"$member_of" && continue
            gql 'mutation($user: String!, $group: Int!) { addUserToGroup(userId: $user, groupId: $group) { ok } }' \
              "$(jq -n --arg user "$id" --argjson group "$(group_id "$group")" '{user: $user, group: $group}')" >/dev/null
            echo "added $id to $group"
          done < <(jq -r '.groups[]' <<<"$user")
          if [[ $(jq -r .password <<<"$user") == true ]]; then
            # Passwords are set through LLDAP's own protocol (OPAQUE), not GraphQL.
            LLDAP_USER_PASSWORD="$(<"$CREDENTIALS_DIRECTORY/user-$id")" \
              lldap_set_password --base-url "$base" --token "$token" --username "$id" >/dev/null
          fi
        done < <(jq -c '.users[]' "$spec")
      '';
    };
  in {
    options.lldap = {
      enable = lib.mkEnableOption ''
        LLDAP, the directory of users and groups Authelia authenticates
        against, keeping it in the infra Postgres cluster (HomeInfra's
        `postgres.roles.lldap`). It needs `lldap/postgres/{host,username,password}`,
        `lldap/{jwt-secret,key-seed}` and the stack admin's password
        (`infra.admin.passwordSecret`, `admin/password`) in the host's
        nix-secrets file before it is enabled: sops-nix fails activation on a
        missing key. The key seed derives the server key every password is
        bound to, so replacing it invalidates them all
      '';

      key = lib.mkOption {
        type = lib.types.str;
        default = "ldap";
        description = "Subdomain of `infra.domain` NetBird's reverse proxy serves the admin UI on.";
      };

      httpPort = lib.mkOption {
        type = lib.types.port;
        default = 17170;
        description = "Port of the web UI and its API.";
      };

      ldapPort = lib.mkOption {
        type = lib.types.port;
        # The standard port: DSM's LDAP join only ever probes 389.
        default = 389;
        description = "Port of the LDAP server: on loopback, and on the mesh for `ldapAccessGroups`.";
      };

      ldapAccessGroups = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [];
        example = ["Server"];
        description = ''
          NetBird groups whose peers may reach LDAP over the mesh, for
          appliances that read the directory themselves (the NAS). Empty keeps
          it on loopback, for Authelia alone. Plain LDAP: WireGuard encrypts
          the mesh. They bind as a read-only account (`lldap_strict_readonly`)
          from `ensure.users`.
        '';
      };

      baseDn = lib.mkOption {
        type = lib.types.str;
        default = lib.concatMapStringsSep "," (part: "dc=${part}") (lib.splitString "." infra.domain);
        defaultText = lib.literalExpression ''"dc=…" for each label of infra.domain'';
        description = "Base DN of the directory; users are under `ou=people`, groups under `ou=groups`.";
      };

      interface = lib.mkOption {
        type = lib.types.str;
        default = "nb-wt0";
        description = "Mesh interface on which the web UI is reachable, for the reverse proxy.";
      };

      accessGroups = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = ["Admin"];
        description = "NetBird groups allowed to reach the admin UI.";
      };

      ensure = {
        groups = lib.mkOption {
          type = lib.types.listOf lib.types.str;
          default = [];
          example = ["Admin"];
          description = "Groups created when missing; never deleted.";
        };

        users = lib.mkOption {
          type = lib.types.attrsOf (lib.types.submodule {
            options = {
              email = lib.mkOption {
                type = lib.types.str;
                description = "Email address, unique among LLDAP's users. Authelia mails one-time codes and reset links to it.";
              };
              displayName = lib.mkOption {
                type = lib.types.str;
                default = "";
                description = "Display name.";
              };
              groups = lib.mkOption {
                type = lib.types.listOf lib.types.str;
                default = [];
                description = ''
                  Groups the user is added to when missing, built in
                  (`lldap_admin`, `lldap_password_manager`,
                  `lldap_strict_readonly`) or in `ensure.groups`; never taken
                  away. A password manager cannot reset an `lldap_admin`'s
                  password, so someone whose password Authelia should reset
                  stays out of it.
                '';
              };
              passwordSecret = lib.mkOption {
                type = lib.types.nullOr lib.types.str;
                default = null;
                example = "authelia/ldap-password";
                description = ''
                  Key of the user's password in the host's nix-secrets file,
                  re-applied at every run: for service accounts. Null leaves
                  the password to its owner, who sets the first one with
                  Authelia's "Reset password".
                '';
              };
            };
          });
          default = {};
          description = ''
            Users created when missing, by user ID. Nothing here deletes a user,
            changes one's email or name, or takes a group away; a oneshot
            (`lldap-ensure`) applies it after LLDAP starts, as the admin.
          '';
        };
      };
    };

    config = lib.mkIf cfg.enable {
      assertions =
        lib.mapAttrsToList (id: user: let
          unknown = lib.subtractLists (cfg.ensure.groups ++ builtinGroups) user.groups;
        in {
          assertion = unknown == [];
          message = "lldap.ensure.users.${id}: ${lib.concatStringsSep ", " unknown} is neither built in nor in lldap.ensure.groups.";
        })
        cfg.ensure.users;

      # Declared users and groups, applied as the admin once LLDAP answers, again
      # whenever LLDAP restarts or the declaration changes.
      systemd.services.lldap-ensure = lib.mkIf ensure {
        description = "Create LLDAP's declared users and groups";
        requires = ["lldap.service"];
        after = ["lldap.service"];
        partOf = ["lldap.service"];
        wantedBy = ["multi-user.target"];
        restartTriggers = [ensureSpec];
        serviceConfig = {
          Type = "oneshot";
          RemainAfterExit = true;
          ExecStart = lib.getExe ensureScript;
          DynamicUser = true;
          RuntimeDirectory = "lldap-ensure";
          RuntimeDirectoryMode = "0700";
          # PID 1 copies the root-only secrets for the dynamic user.
          LoadCredential =
            ["admin-password:${secret infra.admin.passwordSecret}"]
            ++ lib.mapAttrsToList (id: user: "${passwordCredential id}:${secret user.passwordSecret}") usersWithPassword;
          NoNewPrivileges = true;
          PrivateTmp = true;
          PrivateDevices = true;
          ProtectSystem = "strict";
          ProtectHome = true;
          ProtectKernelTunables = true;
          ProtectKernelModules = true;
          ProtectControlGroups = true;
          RestrictAddressFamilies = ["AF_INET" "AF_INET6"];
          LockPersonality = true;
          RestrictRealtime = true;
          SystemCallArchitectures = "native";
          CapabilityBoundingSet = "";
        };
      };

      services.lldap = {
        enable = true;
        # Postgres is PlanetScale's, reached with the URL from lldap.env.
        database.createLocally = false;
        settings = {
          # Authelia binds on the same host. Peers in `ldapAccessGroups` dial
          # the mesh address, and the firewall keeps the port off every other
          # interface.
          ldap_host =
            if cfg.ldapAccessGroups == []
            then "127.0.0.1"
            else "0.0.0.0";
          ldap_port = cfg.ldapPort;
          # The reverse proxy dials the host's mesh address; the firewall keeps
          # the port off every other interface.
          http_host = "0.0.0.0";
          http_port = cfg.httpPort;
          http_url = "https://${cfg.key}.${infra.domain}";
          ldap_base_dn = cfg.baseDn;
          # The stack's admin, who also owns NetBird, with the same password.
          ldap_user_dn = infra.admin.name;
          ldap_user_email = infra.admin.email;
          # The admin password is the one in nix-secrets, restored on every
          # start, so it cannot drift from NetBird's owner's.
          force_ldap_user_pass_reset = "always";
          # The server key comes from the key seed, not a file in the state
          # directory; an empty path silences LLDAP's warning about ignoring it.
          key_file = "";
        };
        # LLDAP reads `<option>_FILE` for any option. The unit runs as a
        # dynamic user, so the files are systemd credentials (%d), which PID 1
        # copies from the root-only secrets.
        environment = {
          LLDAP_JWT_SECRET_FILE = "%d/jwt-secret";
          LLDAP_KEY_SEED_FILE = "%d/key-seed";
          LLDAP_LDAP_USER_PASS_FILE = "%d/admin-password";
        };
        # Read by PID 1 for EnvironmentFile before it drops to the service
        # user, so it stays root's alone.
        environmentFile = config.sops.templates."lldap.env".path;
      };

      systemd.services.lldap.serviceConfig = {
        # A port below 1024 needs this one capability, which the dynamic user
        # otherwise lacks (the upstream unit drops every capability).
        CapabilityBoundingSet = lib.mkIf (cfg.ldapPort < 1024) (lib.mkForce ["CAP_NET_BIND_SERVICE"]);
        AmbientCapabilities = lib.mkIf (cfg.ldapPort < 1024) ["CAP_NET_BIND_SERVICE"];
        LoadCredential = [
          "jwt-secret:${secret "lldap/jwt-secret"}"
          "key-seed:${secret "lldap/key-seed"}"
          "admin-password:${secret infra.admin.passwordSecret}"
        ];
        # LLDAP opens its ports once it has reached and migrated the database,
        # seconds after it starts. Started means LDAP answers, so a unit after
        # it finds it up: Authelia's startup check dials it and exits on a
        # refusal.
        ExecStartPost = pkgs.writeShellScript "lldap-wait-for-ldap" ''
          while kill -0 "$MAINPID" 2>/dev/null; do
            if (exec 3<>/dev/tcp/127.0.0.1/${toString cfg.ldapPort}) 2>/dev/null; then
              exit 0
            fi
            sleep 0.2
          done
          echo "lldap exited before LDAP answered" >&2
          exit 1
        '';
      };

      sops.secrets =
        lib.genAttrs (generated ++ postgres) (_: {
          restartUnits = ["lldap.service"];
        })
        // lib.mapAttrs' (_: user: lib.nameValuePair user.passwordSecret {restartUnits = ["lldap-ensure.service"];}) usersWithPassword;

      # sqlx, not libpq: it reads `sslrootcert` as a file path, and verifies
      # `verify-full` against its bundled Mozilla roots without one.
      sops.templates."lldap.env" = {
        content = ''
          LLDAP_DATABASE_URL=postgres://${placeholder "lldap/postgres/username"}:${placeholder "lldap/postgres/password"}@${placeholder "lldap/postgres/host"}:5432/lldap?sslmode=verify-full
        '';
        restartUnits = ["lldap.service"];
      };

      # Private like every admin console on the proxy: only Admin peers reach
      # it, and LLDAP's own login decides the rest.
      httpServices.${cfg.key} = {
        port = cfg.httpPort;
        expose = {
          enable = true;
          private = true;
          inherit (cfg) accessGroups;
        };
        auth.type = "none";
      };

      # The stack turns it into a policy letting those groups' peers in.
      meshServices = lib.mkIf (cfg.ldapAccessGroups != []) {
        ldap = {
          port = cfg.ldapPort;
          groups = cfg.ldapAccessGroups;
        };
      };

      networking.firewall.interfaces.${cfg.interface}.allowedTCPPorts =
        [cfg.httpPort] ++ lib.optional (cfg.ldapAccessGroups != []) cfg.ldapPort;
    };
  };
}
