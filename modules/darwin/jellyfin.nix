{...}: {
  flake.modules.darwin.jellyfin = {
    config,
    pkgs,
    lib,
    user,
    ...
  }: let
    inherit
      (lib)
      mkIf
      getExe
      mkEnableOption
      mkOption
      mkPackageOption
      optionalString
      ;
    inherit (lib.types) listOf path str;
    cfg = config.services.jellyfin;
    # Authelia's client for Jellyfin. The secret is in nix-secrets twice: in
    # this host's file for the plugin, and as a PBKDF2 digest in the Authelia
    # host's file (`secretDigest`).
    ssoSecret = "authelia/oidc/clients/${cfg.oidc.clientId}/secret";
    ssoSecretDigest = "${ssoSecret}-digest";
    ssoSecretFile = config.sops.secrets.${ssoSecret}.path;
    agentLabel = config.launchd.user.agents.jellyfin.serviceConfig.Label;
    ssoPlugin = pkgs.stdenvNoCC.mkDerivation rec {
      pname = "jellyfin-plugin-sso";
      version = "4.0.0.3";
      src = pkgs.fetchurl {
        url = "https://github.com/9p4/jellyfin-plugin-sso/releases/download/v${version}/sso-authentication_${version}.zip";
        hash = "sha256-3glRJVvsTtZGA3ZB5+CqEhCzoAoUFAZUgIe+2ZTLm90=";
      };
      nativeBuildInputs = [pkgs.unzip];
      dontUnpack = true;
      installPhase = ''
        runHook preInstall
        mkdir -p $out
        unzip -q $src -d $out
        runHook postInstall
      '';
      meta = {
        description = "Jellyfin SSO (OIDC/SAML) authentication plugin";
        homepage = "https://github.com/9p4/jellyfin-plugin-sso";
        license = lib.licenses.gpl3Only;
      };
    };
    # builtins.toXML emits Nix's <expr>/<attrs> dump, not Jellyfin's schema.
    # Build the real documents as Nix strings instead.
    updateKnownProxies = pkgs.writeShellScript "jellyfin-update-known-proxies" ''
      set -euo pipefail
      path="$1"
      tmp="$(mktemp)"
      if [ -s "$path" ]; then
        ${getExe pkgs.xmlstarlet} ed -d '/NetworkConfiguration/KnownProxies' "$path" >"$tmp"
      else
        printf '%s\n' \
          '<?xml version="1.0" encoding="utf-8"?>' \
          '<NetworkConfiguration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' \
          '</NetworkConfiguration>' >"$tmp"
      fi
      ${getExe pkgs.xmlstarlet} ed -L \
        -s '/NetworkConfiguration' -t elem -n KnownProxies -v "" \
        "$tmp"
      ${lib.concatMapStrings (proxy: ''
          ${getExe pkgs.xmlstarlet} ed -L \
            -s '/NetworkConfiguration/KnownProxies' -t elem -n string -v ${lib.escapeShellArg proxy} \
            "$tmp"
        '')
        cfg.knownProxies}
      mv "$tmp" "$path"
    '';

    oidcCanonicalLinks =
      if cfg.oidc.canonicalUsername != "" && cfg.oidc.canonicalUserId != ""
      then ''
        <CanonicalLinks>
          <item>
            <key>
              <string>${lib.escapeXML cfg.oidc.canonicalUsername}</string>
            </key>
            <value>
              <guid>${lib.escapeXML (lib.toLower cfg.oidc.canonicalUserId)}</guid>
            </value>
          </item>
        </CanonicalLinks>''
      else "<CanonicalLinks />";

    # Secret is injected at activation with replace-secret (never copied into the store).
    oidcConfigTemplate = pkgs.writeText "jellyfin-SSO-Auth.xml" ''
      <?xml version="1.0" encoding="utf-8"?>
      <PluginConfiguration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
        <SamlConfigs />
        <OidConfigs>
          <item>
            <key>
              <string>${lib.escapeXML cfg.oidc.providerName}</string>
            </key>
            <value>
              <PluginConfiguration>
                <OidEndpoint>${lib.escapeXML cfg.oidc.issuer}</OidEndpoint>
                <OidClientId>${lib.escapeXML cfg.oidc.clientId}</OidClientId>
                <OidSecret>@oidcSecret@</OidSecret>
                <Enabled>true</Enabled>
                <EnableAuthorization>false</EnableAuthorization>
                <EnableAllFolders>true</EnableAllFolders>
                <EnabledFolders />
                <AdminRoles />
                <Roles />
                <EnableFolderRoles>false</EnableFolderRoles>
                <EnableLiveTvRoles>false</EnableLiveTvRoles>
                <EnableLiveTv>true</EnableLiveTv>
                <EnableLiveTvManagement>false</EnableLiveTvManagement>
                <LiveTvRoles />
                <LiveTvManagementRoles />
                <FolderRoleMappings />
                <RoleClaim>groups</RoleClaim>
                <OidScopes>
                  <string>email</string>
                </OidScopes>
                ${oidcCanonicalLinks}
                <DefaultUsernameClaim>${lib.escapeXML cfg.oidc.usernameClaim}</DefaultUsernameClaim>
                <NewPath>true</NewPath>
                <DisableHttps>false</DisableHttps>
                <DoNotValidateEndpoints>false</DoNotValidateEndpoints>
                <DoNotValidateIssuerName>false</DoNotValidateIssuerName>
                <DisablePushedAuthorization>true</DisablePushedAuthorization>
                <SchemeOverride>${lib.escapeXML cfg.oidc.schemeOverride}</SchemeOverride>
              </PluginConfiguration>
            </value>
          </item>
        </OidConfigs>
      </PluginConfiguration>
    '';
  in {
    options = {
      services.jellyfin = {
        enable = mkEnableOption "Jellyfin Media Server";
        package = mkPackageOption pkgs "jellyfin" {};
        dataDir = mkOption {
          type = path;
          default = "/Users/${user.username}/Library/Application Support/Jellyfin";
          defaultText = "/Users/${user.username}/Library/Application Support/Jellyfin";
          description = ''
            Base data directory,
            passed with `--datadir` see [#data-directory](https://jellyfin.org/docs/general/administration/configuration/#data-directory)
          '';
        };
        configDir = mkOption {
          type = path;
          default = "${cfg.dataDir}/config";
          defaultText = "\${cfg.dataDir}/config";
          description = ''
            Directory containing the server configuration files,
            passed with `--configdir` see [configuration-directory](https://jellyfin.org/docs/general/administration/configuration/#configuration-directory)
          '';
        };
        cacheDir = mkOption {
          type = path;
          default = "/Users/${user.username}/Library/Caches/Jellyfin";
          defaultText = "/Users/${user.username}/Library/Caches/Jellyfin";
          description = ''
            Directory containing the jellyfin server cache,
            passed with `--cachedir` see [#cache-directory](https://jellyfin.org/docs/general/administration/configuration/#cache-directory)
          '';
        };
        logDir = mkOption {
          type = path;
          default = "/Users/${user.username}/Library/Logs/Jellyfin";
          defaultText = "/Users/${user.username}/Library/Logs/Jellyfin";
          description = ''
            Directory where the Jellyfin logs will be stored,
            passed with `--logdir` see [#log-directory](https://jellyfin.org/docs/general/administration/configuration/#log-directory)
          '';
        };
        knownProxies = mkOption {
          type = listOf str;
          default = [];
          example = ["100.64.0.0/10"];
          description = ''
            CIDR ranges written to Jellyfin NetworkConfiguration KnownProxies
            (e.g. NetBird CGNAT so forwarded headers are trusted).
          '';
        };
        oidc = {
          enable = mkEnableOption "Jellyfin sign-in through OpenID Connect (jellyfin-plugin-sso)";
          publicUrl = mkOption {
            type = str;
            example = "https://watch.example.com";
            description = ''
              Jellyfin's public origin. The plugin builds its redirect URI from
              the request (and `schemeOverride`), so the one registered with
              the issuer comes from this.
            '';
          };
          providerName = mkOption {
            type = str;
            default = "authelia";
            description = "Provider key: sign-in starts at `<publicUrl>/sso/OID/start/<name>`.";
          };
          issuer = mkOption {
            type = str;
            default = config.oidcIssuer;
            defaultText = lib.literalExpression "config.oidcIssuer";
            description = ''
              OIDC issuer. It defaults to the flake's Authelia (`oidcIssuer`),
              which then gets the client registered (`oidcClients`).
            '';
          };
          clientId = mkOption {
            type = str;
            default = "jellyfin";
            description = "OIDC client ID.";
          };
          groups = mkOption {
            type = listOf str;
            default = [];
            example = ["media"];
            description = "LLDAP groups whose members may sign in; empty lets every user in.";
          };
          usernameClaim = mkOption {
            type = str;
            default = "email";
            description = "OIDC claim used as the Jellyfin username.";
          };
          schemeOverride = mkOption {
            type = str;
            default = "https";
            description = "Force https in generated redirect URLs behind the reverse proxy.";
          };
          canonicalUsername = mkOption {
            type = str;
            default = "";
            description = "OIDC username/claim value to link to an existing Jellyfin user.";
          };
          canonicalUserId = mkOption {
            type = str;
            default = "";
            description = "Jellyfin user GUID for canonicalUsername (keeps admin on SSO login).";
          };
        };
      };
    };

    config = mkIf cfg.enable {
      sops.secrets = mkIf cfg.oidc.enable {${ssoSecret} = {};};

      # Confidential. The plugin's client (Duende OidcClient 6.0.1) always uses
      # PKCE, posts its secret in the body, and reads the user from userinfo,
      # so the default ID token is enough. Its pushed authorization requests
      # would send the secret in a Basic header instead, and a client has one
      # authentication method, so the plugin's configuration turns PAR off.
      # Sign-in starts at `/sso/OID/start/<name>`, which comes back to
      # `/sso/OID/redirect/<name>` (the legacy `/p/` and `/r/` are unused).
      oidcClients = mkIf (cfg.oidc.enable && cfg.oidc.issuer == config.oidcIssuer) {
        ${cfg.oidc.clientId} = {
          name = "Jellyfin";
          secretDigest = ssoSecretDigest;
          redirectUris = ["${cfg.oidc.publicUrl}/sso/OID/redirect/${cfg.oidc.providerName}"];
          inherit (cfg.oidc) groups;
          settings.token_endpoint_auth_method = "client_secret_post";
        };
      };

      # After sops-nix (`mkAfter`, priority 1500) installed the client secret.
      system.activationScripts.postActivation.text = lib.mkOrder 1600 ''
        echo "Creating Jellyfin directories..."
        mkdir -p '${cfg.dataDir}' && chown -R '${user.username}' '${cfg.dataDir}'
        mkdir -p '${cfg.configDir}' && chown -R '${user.username}' '${cfg.configDir}'
        mkdir -p '${cfg.cacheDir}' && chown -R '${user.username}' '${cfg.cacheDir}'
        mkdir -p '${cfg.logDir}' && chown -R '${user.username}' '${cfg.logDir}'
        mkdir -p '${cfg.dataDir}/plugins' && chown -R '${user.username}' '${cfg.dataDir}/plugins'
        mkdir -p '${cfg.dataDir}/plugins/configurations' && chown -R '${user.username}' '${cfg.dataDir}/plugins/configurations'
        ${optionalString (cfg.knownProxies != []) ''
          echo "Updating Jellyfin KnownProxies..."
          ${updateKnownProxies} '${cfg.configDir}/network.xml'
          chown '${user.username}' '${cfg.configDir}/network.xml'
        ''}
        ${optionalString cfg.oidc.enable ''
          echo "Installing Jellyfin SSO (OIDC) plugin..."
          # Remove previous Remote Auth / SSO-entry leftovers.
          rm -rf '${cfg.dataDir}/plugins/RemoteAuth'
          rm -f '${cfg.dataDir}/plugins/configurations/Jellyfin.Plugin.RemoteAuth.xml'

          plugin_dir='${cfg.dataDir}/plugins/SSO-Auth'
          mkdir -p "$plugin_dir"
          cp -f '${ssoPlugin}/SSO-Auth.dll' "$plugin_dir/"
          cp -f '${ssoPlugin}/Duende.IdentityModel.dll' "$plugin_dir/"
          cp -f '${ssoPlugin}/Duende.IdentityModel.OidcClient.dll' "$plugin_dir/"
          cp -f '${ssoPlugin}/meta.json' "$plugin_dir/"
          # Jellyfin rewrites meta.json on load; nix store copies are mode 444.
          chmod -R u+rwX "$plugin_dir"
          chown -R '${user.username}' "$plugin_dir"

          if [ ! -f '${ssoSecretFile}' ]; then
            echo "Jellyfin OIDC client secret file missing: ${ssoSecretFile}" >&2
            exit 1
          fi

          config_xml='${cfg.dataDir}/plugins/configurations/SSO-Auth.xml'
          rendered="$(mktemp "$config_xml.XXXXXX")"
          install -m 600 '${oidcConfigTemplate}' "$rendered"
          ${getExe pkgs.replace-secret} '@oidcSecret@' '${ssoSecretFile}' "$rendered"
          chown '${user.username}' "$rendered"
          # Jellyfin reads plugin configuration once, at start, and writes back
          # what it holds whenever it changes it (a new SSO user's link). So it
          # restarts when the configuration or the plugin is new, rather than
          # running on, and bringing back, the old one.
          stamp="$plugin_dir/.nix-config.sha256"
          want="$({ cat "$rendered"; echo '${ssoPlugin}'; } | ${pkgs.coreutils}/bin/sha256sum | cut -d ' ' -f 1)"
          mv -f "$rendered" "$config_xml"
          if [ "$(cat "$stamp" 2>/dev/null)" != "$want" ]; then
            echo "Restarting Jellyfin for its new SSO configuration..."
            if launchctl kickstart -k "gui/$(id -u '${user.username}')/${agentLabel}"; then
              printf '%s\n' "$want" >"$stamp"
            else
              echo "warning: could not restart Jellyfin; it keeps its old SSO configuration until it restarts" >&2
            fi
          fi
        ''}
      '';

      launchd.user.agents = {
        jellyfin = {
          serviceConfig = {
            Label = "org.jellyfin.server";
            ProgramArguments = [
              "${getExe cfg.package}"
              "--datadir"
              "${cfg.dataDir}"
              "--configdir"
              "${cfg.configDir}"
              "--cachedir"
              "${cfg.cacheDir}"
              "--logdir"
              "${cfg.logDir}"
            ];
            WorkingDirectory = "${cfg.dataDir}";
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
      };
    };
  };
}
