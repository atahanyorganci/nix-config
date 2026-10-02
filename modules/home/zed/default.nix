{config, ...}: let
  inherit (config.flake.inventory) managedTargets;
in {
  flake.modules.homeManager.zed = {
    lib,
    config,
    osConfig,
    pkgs,
    user,
    ...
  }: let
    cfg = config.zed;
    package = pkgs.zed-editor;
    remoteServer = package.remoteServerExecutableName;

    # The CLI launches the app bundle it was itself started from, which on
    # macOS is the `/nix/store` one. The Dock pins nix-darwin's copy in
    # `/Applications/Nix Apps` instead (see `modules/darwin/system.nix`), and
    # macOS tells bundles apart by path, so the store app came up as a second
    # tile. `--zed` points every `zeditor` call, `$EDITOR` included, at the
    # pinned copy; nix-darwin installs the same `pkgs.zed-editor`, so the CLI
    # and the app it talks to stay the same version.
    cli =
      if pkgs.stdenv.hostPlatform.isDarwin
      then
        pkgs.symlinkJoin {
          name = "zed-editor-${package.version}";
          paths = [package];
          nativeBuildInputs = [pkgs.makeWrapper];
          postBuild = ''
            wrapProgram "$out/bin/${package.meta.mainProgram}" \
              --add-flag --zed --add-flag "/Applications/Nix Apps/Zed.app"
          '';
          inherit (package) meta;
        }
      else package;
    isAgentHolder = (osConfig.hostInventory.role or null) == "agentHolder";
    connectionsFor = name: target: let
      entry = label: host:
        lib.optional (lib.elem host target.ssh.hostNames) {
          inherit host;
          nickname = "${name} (${label})";
        };
    in
      entry "Local" "${name}.local" ++ entry "Netbird" "${name}.netbird.selfhosted";
  in {
    options.zed = {
      enable = lib.mkEnableOption "Zed";
      remoteServer.enable = lib.mkEnableOption "the Zed remote server, so Zed can edit this host over SSH";
    };
    config = lib.mkMerge [
      (lib.mkIf cfg.enable {
        programs.zed-editor = {
          enable = true;
          package = cli;
          defaultEditor = true;
          # Everything is owned by Nix: settings and keymaps are read-only
          # symlinks, so changes made from Zed's UI will not persist.
          mutableUserSettings = false;
          mutableUserKeymaps = false;
          mutableUserTasks = false;
          mutableUserDebug = false;
          extensions = [
            "astro"
            "docker-compose"
            "dockerfile"
            "fish"
            "git-firefly"
            "just"
            "latex"
            "nix"
            "nu"
            "prisma"
            "sql"
            "templ"
            "terraform"
            "toml"
            "xml"
          ];
          # Cursor Dark, ported to Zed by Nexmoe and copied unmodified from
          # https://github.com/nexmoe/cursor-themes-for-zed at commit
          # 46278c624a7174e4f19fa07b58523bc7512a0dc3 (MIT, see ./themes/LICENSE).
          # An unofficial port of Anysphere's Cursor Dark theme; the same
          # palette drives the rest of the system through Stylix.
          themes.cursor-dark = ./themes/cursor-dark.json;
          userSettings = {
            auto_update = false;
            ssh_connections = lib.optionals isAgentHolder (
              lib.concatLists (lib.mapAttrsToList connectionsFor managedTargets)
            );
            # Otherwise Zed also lists every alias in ~/.ssh/config, unlabelled,
            # beside the connections above.
            read_ssh_config = false;
            base_keymap = "VSCode";
            theme = "Cursor Dark";
            # Editor
            auto_indent_on_paste = true;
            colorize_brackets = false;
            ensure_final_newline_on_save = true;
            format_on_save = "on";
            minimap.show = "never";
            remove_trailing_whitespace_on_save = true;
            show_edit_predictions = true;
            show_whitespaces = "all";
            soft_wrap = "editor_width";
            file_types = {
              JSONC = ["*.json"];
              Markdown = ["*.rmd"];
              # Git Firefly detects most Git files on its own; these are the
              # paths its README says need mapping by hand.
              "Git Attributes" = ["**/{git,.git,.git/info}/attributes"];
              "Git Config" = ["*.gitconfig" "**/{git,.git,.git/modules,.git/modules/*}/config"];
              "Git Ignore" = ["**/{git,.git}/ignore" "**/.git/info/exclude"];
            };
            # Panels
            agent.dock = "right";
            collaboration_panel.dock = "left";
            git_panel.dock = "left";
            outline_panel.dock = "left";
            project_panel.dock = "left";
            terminal = {
              shell.program = lib.getExe pkgs.${user.shell};
              font_size = 12;
            };
            # Language servers and formatters are pinned to store paths so
            # they work however Zed is launched, including from the Dock.
            languages.Nix = {
              language_servers = ["nil" "!nixd" "..."];
              formatter.external = {
                command = lib.getExe pkgs.alejandra;
                arguments = ["--quiet" "--"];
              };
              indent_guides.coloring = "fixed";
              tab_size = 2;
            };
            lsp.nil.binary.path = lib.getExe pkgs.nil;
          };
          userKeymaps = let
            # The key left of 1 on Apple ISO keyboards (VS Code's
            # `IntlBackslash`), which types `"` on Turkish-QWERTY-PC.
            toggleTerminal = "cmd-\"";
          in [
            {
              context = "Workspace";
              bindings = {
                "cmd-shift-s" = "workspace::SaveAll";
                "cmd-alt-s" = null;
                ${toggleTerminal} = "terminal_panel::Toggle";
                "cmd-j" = null;
              };
            }
            {
              # Editors bind it to `editor::ExpandAllDiffHunks`, and the
              # narrower context would win over the Workspace binding.
              context = "Editor";
              bindings.${toggleTerminal} = "terminal_panel::Toggle";
            }
            {
              context = "Terminal";
              bindings = {
                # Line continuation for multi-line input in terminal agents.
                "shift-enter" = ["terminal::SendText" "\\\r\n"];
              };
            }
          ];
        };
        stylix.targets.zed = {
          # The Cursor Dark theme above replaces Stylix's base16 rendition.
          colors.enable = false;
          # Stylix converts points to pixels (x4/3): 14px UI, 12px buffers.
          fonts.override = {
            sizes = {
              applications = 10.5;
              terminal = 9;
            };
            sansSerif.name = "Cascadia Code NF";
            monospace.name = "Cascadia Code NF";
          };
        };
      })
      (lib.mkIf cfg.remoteServer.enable {
        home.file.".zed_server/${remoteServer}".source = lib.getExe' package.remote_server remoteServer;
      })
    ];
  };
}
