{
  flake.modules = {
    # `rex.enable` and `rex.server.enable` are Home Manager options (the entry
    # point); the system modules below act on whatever the Home Manager users
    # of the machine turned on.
    #
    # GUI apps are installed system-wide (Home Manager's `copyApps` is off, see
    # `modules/darwin/system.nix`), so Rex.app goes into `/Applications/Nix
    # Apps` whenever any user enables `rex`. A user with `rex.server.enable`
    # gets a launchd daemon that runs `rex server run` as that user from boot:
    # a Home Manager launchd agent would only start at a GUI login, and the
    # servers (venus) have no auto-login.
    darwin.rex = {
      config,
      lib,
      pkgs,
      ...
    }: let
      users = config.home-manager.users or {};
      servers = lib.filterAttrs (_: user: user.rex.server.enable or false) users;
    in {
      config = lib.mkMerge [
        (lib.mkIf (lib.any (user: user.rex.enable or false) (lib.attrValues users)) {
          environment.systemPackages = [pkgs.rex-app];
        })
        {
          launchd.daemons = lib.mapAttrs' (name: user: let
            cfg = user.rex.server;
            home = user.home.homeDirectory;
          in
            lib.nameValuePair "rex-${name}" {
              serviceConfig = {
                UserName = name;
                ProgramArguments = [(lib.getExe cfg.package) "server" "run"] ++ cfg.extraArgs;
                RunAtLoad = true;
                KeepAlive = true;
                # launchd gives daemons a bare environment. HOME is what Rex
                # derives its socket from (~/Library/Application Support/rex/
                # server.sock), which is where `ssh://` clients look for it.
                EnvironmentVariables =
                  cfg.environment
                  // {
                    HOME = home;
                    USER = name;
                    LOGNAME = name;
                    PATH = lib.concatStringsSep ":" [
                      "/etc/profiles/per-user/${name}/bin"
                      "/run/current-system/sw/bin"
                      "/nix/var/nix/profiles/default/bin"
                      "/usr/local/bin"
                      "/usr/bin"
                      "/bin"
                      "/usr/sbin"
                      "/sbin"
                    ];
                  };
                StandardOutPath = "${home}/Library/Logs/rex-server.log";
                StandardErrorPath = "${home}/Library/Logs/rex-server.log";
              };
            })
          servers;
        }
      ];
    };

    # A systemd user service only runs while its user is logged in, unless the
    # user lingers. Lingering starts the user manager, and the Rex server with
    # it, at boot and keeps it running after logout.
    nixos.rex = {
      config,
      lib,
      ...
    }: let
      servers = lib.filterAttrs (_: user: user.rex.server.enable or false) (config.home-manager.users or {});
    in {
      config.users.users = lib.mapAttrs (_: _: {linger = true;}) servers;
    };

    homeManager.rex = {
      lib,
      config,
      pkgs,
      ...
    }: let
      cfg = config.rex;
      configDir = ./config;

      # `rex.settings` (generated, see ./generated/settings-options.nix) mirrors
      # the keys under `Workspace.`, nesting on dots. Null means "not set":
      # drop it so Rex applies its own default instead of a pinned one.
      toDefaults = prefix: attrs:
        lib.concatMapAttrs (
          name: value:
            if value == null
            then {}
            else if lib.isAttrs value
            then toDefaults "${prefix}${name}." value
            else {"${prefix}${name}" = value;}
        )
        attrs;
    in {
      options.rex = {
        enable = lib.mkEnableOption "Rex terminal configuration";
        server = {
          enable = lib.mkEnableOption ''
            a long-running Rex server for this account, reachable from other
            machines with `rex -S ssh://HOST`. Runs as a systemd user service
            with lingering on Linux and as a launchd daemon on macOS, from boot
          '';
          package = lib.mkOption {
            type = lib.types.package;
            default = pkgs.rex;
            defaultText = lib.literalExpression "pkgs.rex";
            description = "Rex package the server runs; also installed so `ssh://` clients find `rex`.";
          };
          extraArgs = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [];
            example = ["--max-sessions" "16"];
            description = "Extra arguments for `rex server run`.";
          };
          environment = lib.mkOption {
            type = lib.types.attrsOf lib.types.str;
            default = {};
            description = ''
              Environment for the server and the programs it starts. The
              defaults point TERMINFO_DIRS at Rex's `xterm-rex` entry (the
              trailing colon keeps the system's) and clear GODEBUG, which
              stops Go from starting when it names a removed setting.
            '';
          };
        };
        extraSettings = lib.mkOption {
          type = lib.types.attrsOf lib.types.anything;
          default = {};
          example = {"Workspace.sshAgentChoice" = "system";};
          description = ''
            Raw entries for the `com.superlogical.rex` defaults domain, keyed
            by the full preference name. Layered over `rex.settings`, for keys
            the generator does not expose.
          '';
        };
      };
      config = lib.mkMerge [
        (lib.mkIf cfg.enable {
          xdg.configFile."rex" = {
            enable = true;
            recursive = true;
            source = configDir;
          };

          # Styling lives in the Mac app's settings, not in `init.lua`. Matched to
          # Ghostty; Nix resets them on every switch. The theme itself is imported
          # once by hand (Settings > Themes > Import Theme) and is not managed here.
          rex.settings = lib.mapAttrs (_: lib.mkDefault) {
            appearance = "dark";
            interfaceStyle = "useTheme";
            inactivePaneFadeMode = "none";
            usesStandardInactiveWindowPaneStyles = false;
            terminalFontName = config.stylix.fonts.monospace.name;
            terminalFallbackFontNames = [config.stylix.fonts.emoji.name];
            terminalFontPointSize = config.terminal.font.size;
            terminalFontStyle = config.terminal.font.style;
            terminalPaddingX = config.terminal.padding.x;
            terminalPaddingY = config.terminal.padding.y;
            activityGrouping = "priority";
            paneHeaderVisibility = "onHover";
            shellIconTheme = "default";
            sidebarPosition = "left";
            tabBarEdge = "top";
            tabIconTintMode = "off";
            tabStyle = "vertical";
            toolbarBehavior = "onHover";
          };

          rex.extraSettings = lib.mapAttrs (_: lib.mkDefault) (
            {
              # Keep session names as given instead of letting agents rename them.
              "rex.agents.names-sessions" = false;
            }
            # SSH keys live in gpg-agent (YubiKey) wherever it serves SSH.
            // lib.optionalAttrs (config.services.gpg-agent.enable && config.services.gpg-agent.enableSshSupport) {
              "Workspace.sshAgentChoice" = "gpg-agent";
            }
          );

          targets.darwin.defaults."com.superlogical.rex" = lib.mkIf pkgs.stdenv.hostPlatform.isDarwin (
            toDefaults "Workspace." cfg.settings
            // cfg.extraSettings
            // {
              # Rex.app comes from Nix (`flake.overlays.rex-app`, installed by
              # `darwin.rex` above when this module is enabled); stop Sparkle from
              # updating it in place and drifting from the pinned build.
              SUEnableAutomaticChecks = false;
              SUAutomaticallyUpdate = false;
            }
          );
        })

        (lib.mkIf cfg.server.enable {
          home.packages = [cfg.server.package];

          rex.server.environment = lib.mapAttrs (_: lib.mkDefault) {
            TERMINFO_DIRS = "${cfg.server.package}/share/terminfo:";
            GODEBUG = "";
          };

          # On Linux the server is a systemd user service; `nixos.rex` turns on
          # lingering so it starts at boot. On macOS `darwin.rex` runs it as a
          # launchd daemon instead. Settings follow upstream's unit
          # (`home-manager-module.nix` in the `rex` flake input).
          systemd.user.services.rex = lib.mkIf pkgs.stdenv.hostPlatform.isLinux {
            Unit = {
              Description = "Rex Server";
              Documentation = ["https://superlogical.com"];
              After = ["network-online.target"];
              # A restart ends every session, so a switch leaves the running
              # server alone; restart it to pick up a new version.
              X-SwitchMethod = "keep-old";
            };
            Service = {
              # Rex reports readiness, so `systemctl --user start rex` returns
              # once clients can connect.
              Type = "notify";
              NotifyAccess = "main";
              ExecStart = lib.escapeShellArgs ([(lib.getExe cfg.server.package) "server" "run"] ++ cfg.server.extraArgs);
              Environment = lib.mapAttrsToList (name: value: "${name}=${value}") (
                cfg.server.environment
                // {
                  # Only set together with Delegate below: lets the server give
                  # each terminal a cgroup of its own.
                  REX_CGROUP_DELEGATED = "1";
                }
              );
              Restart = "on-failure";
              RestartSec = "5s";
              # SIGTERM to the server alone, so it saves every session before
              # systemd kills what is left in its terminals.
              KillMode = "mixed";
              # One terminal killed for memory must not stop the whole unit.
              OOMPolicy = "continue";
              OOMScoreAdjust = 0;
              # Hand the cgroup to the server so systemd-oomd can kill a single
              # terminal instead of every session.
              Delegate = true;
              DelegateSubgroup = "server";
            };
            Install.WantedBy = ["default.target"];
          };
        })
      ];
    };
  };
}
