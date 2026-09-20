{
  flake.modules.homeManager.pi = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.programs.pi;

    jsonFormat = pkgs.formats.json {};

    # Every generated option defaults to null, meaning "not configured". Pi
    # layers project settings over global ones and applies its own defaults for
    # absent keys, so a null must produce an absent key rather than a JSON
    # null: `{"theme": null}` is not the same as omitting `theme`.
    stripNulls = value:
      if lib.isAttrs value && !lib.isDerivation value
      then lib.mapAttrs (_: stripNulls) (lib.filterAttrs (_: inner: inner != null) value)
      else value;

    # Declarative settings, with the free-form escape hatch layered on top so a
    # setting the generator does not yet know about is still reachable.
    settingsJson = lib.recursiveUpdate (stripNulls cfg.settings) cfg.extraSettings;
    keybindingsJson = stripNulls cfg.keybindings;

    hasSettings = settingsJson != {};
    hasKeybindings = keybindingsJson != {};
    hasModels = cfg.models != {};

    settingsFile = jsonFormat.generate "pi-settings.json" settingsJson;
    keybindingsFile = jsonFormat.generate "pi-keybindings.json" keybindingsJson;
    modelsFile = jsonFormat.generate "pi-models.json" cfg.models;

    # Files are copied into place, not symlinked. Pi rewrites settings.json at
    # runtime (`/model` Ctrl+S, `/settings`, and its own changelog/analytics
    # bookkeeping all call writeFileSync). A read-only /nix/store symlink makes
    # those writes fail with EACCES, and pi collects the error instead of
    # raising it, so the save silently does nothing.
    managedFiles =
      lib.optional hasSettings {
        name = "settings.json";
        source = settingsFile;
        # Pi maintains these itself; they must not count as user edits.
        ignoreKeys = builtins.toJSON cfg.runtimeStateKeys;
      }
      ++ lib.optional hasKeybindings {
        name = "keybindings.json";
        source = keybindingsFile;
      }
      ++ lib.optional hasModels {
        name = "models.json";
        source = modelsFile;
      };

    # Each file is tracked by a sidecar checksum of the last content Nix wrote.
    # That distinguishes "unchanged since activation" from "edited by hand or
    # by pi", so local edits are preserved instead of being overwritten on
    # every activation.
    installScript = let
      install = file: ''
        piInstallManagedFile ${lib.escapeShellArg file.name} ${file.source} ${lib.escapeShellArg (file.ignoreKeys or "")}
      '';
    in ''
      piConfigDir=${lib.escapeShellArg cfg.configDir}
      piStateDir="$piConfigDir/.hm-state"

      # Hash a managed file ignoring the keys pi maintains itself. Pi merges
      # into settings.json rather than replacing it, so it adds keys like
      # lastChangelogVersion on the first run after an upgrade. Comparing raw
      # bytes would read that as a user edit and refuse every later update.
      piDigest() {
        local file="$1" ignore="$2"
        if [ -z "$ignore" ]; then
          ${lib.getExe' pkgs.coreutils "sha256sum"} "$file" | ${lib.getExe' pkgs.coreutils "cut"} -d' ' -f1
          return
        fi
        ${lib.getExe pkgs.jq} -S --argjson drop "$ignore" \
          'if type == "object" then delpaths($drop | map([.])) else . end' "$file" 2>/dev/null \
          | ${lib.getExe' pkgs.coreutils "sha256sum"} | ${lib.getExe' pkgs.coreutils "cut"} -d' ' -f1
      }

      piInstallManagedFile() {
        local name="$1" src="$2" ignore="$3"
        local dest="$piConfigDir/$name"
        local stamp="$piStateDir/$name.sha256"
        local newSum
        newSum="$(piDigest "$src" "$ignore")"

        if [ -e "$dest" ] && [ ! -f "$dest" ]; then
          ${lib.getExe' pkgs.coreutils "echo"} "pi: refusing to replace non-regular file $dest" >&2
          return 1
        fi

        if [ -f "$dest" ] && [ -f "$stamp" ]; then
          local currentSum previousSum
          currentSum="$(piDigest "$dest" "$ignore")"
          previousSum="$(${lib.getExe' pkgs.coreutils "cat"} "$stamp")"
          if [ "$currentSum" = "$newSum" ]; then
            return 0
          fi
          if [ "$currentSum" != "$previousSum" ]; then
            ${lib.getExe' pkgs.coreutils "echo"} \
              "pi: $dest changed since last activation; writing $dest.hm-new instead" >&2
            ${lib.getExe' pkgs.coreutils "install"} -m 600 "$src" "$dest.hm-new"
            return 0
          fi
        fi

        ${lib.getExe' pkgs.coreutils "install"} -D -m 600 "$src" "$dest"
        ${lib.getExe' pkgs.coreutils "mkdir"} -p "$piStateDir"
        ${lib.getExe' pkgs.coreutils "echo"} "$newSum" > "$stamp"
      }

      ${lib.getExe' pkgs.coreutils "mkdir"} -p "$piConfigDir"
      ${lib.concatMapStrings install managedFiles}
    '';
  in {
    options.programs.pi = {
      enable = lib.mkEnableOption "pi, a coding agent CLI";

      package = lib.mkPackageOption pkgs "pi-coding-agent" {nullable = true;};

      extraPackages = lib.mkOption {
        type = lib.types.listOf lib.types.package;
        default = [];
        example = lib.literalExpression "[ pkgs.nodejs pkgs.bun ]";
        description = ''
          Extra packages placed on the wrapped `pi` binary's PATH.

          Pi shells out for some features: installing npm-sourced packages
          needs {command}`npm`, and some packages need {command}`bun` or
          {command}`git` at runtime.
        '';
      };

      configDir = lib.mkOption {
        type = lib.types.str;
        default = "${config.home.homeDirectory}/.pi/agent";
        defaultText = lib.literalExpression ''"''${config.home.homeDirectory}/.pi/agent"'';
        example = lib.literalExpression ''"''${config.xdg.configHome}/pi/agent"'';
        description = ''
          Directory holding pi's configuration.

          Defaults to {file}`~/.pi/agent`, matching pi's own default. When set
          to anything else, {env}`PI_CODING_AGENT_DIR` is exported so the CLI
          reads from the same place.
        '';
      };

      # The typed sub-options are declared by the generated modules alongside
      # this file; option declarations for the same path merge, so this
      # declaration only carries the prose and the default.
      settings = lib.mkOption {
        type = lib.types.submodule {options = {};};
        default = {};
        example = lib.literalExpression ''
          {
            defaultProvider = "anthropic";
            defaultThinkingLevel = "medium";
            compaction.keepRecentTokens = 20000;
          }
        '';
        description = ''
          Settings written to {file}`settings.json` in
          {option}`programs.pi.configDir`.

          These options are generated from the type definitions shipped with
          pi, so they are typed and validated: an unknown key or an invalid
          enum value fails evaluation instead of being written out and
          rejected later by pi.

          Options left unset are omitted from the file entirely, leaving pi to
          apply its own default.
        '';
      };

      extraSettings = lib.mkOption {
        type = jsonFormat.type;
        default = {};
        example = lib.literalExpression ''{ someNewSetting = true; }'';
        description = ''
          Free-form settings merged over {option}`programs.pi.settings`.

          An escape hatch for settings added by a newer pi than the one the
          typed options were generated from. Values here are not validated.
        '';
      };

      keybindings = lib.mkOption {
        type = lib.types.submodule {options = {};};
        default = {};
        example = lib.literalExpression ''
          {
            "tui.editor.cursorUp" = [ "up" "ctrl+p" ];
            "app.session.new" = "ctrl+n";
          }
        '';
        description = ''
          Keybindings written to {file}`keybindings.json` in
          {option}`programs.pi.configDir`.

          Action ids are generated from pi's type definitions, so a typo in an
          id fails evaluation. Each value is a single key such as
          {command}`ctrl+p`, or a list of keys. Unset actions keep pi's
          default binding.
        '';
      };

      models = lib.mkOption {
        type = jsonFormat.type;
        default = {};
        example = lib.literalExpression ''
          {
            providers.ollama = {
              baseUrl = "http://localhost:11434/v1";
              api = "openai-completions";
              apiKey = "ollama";
              models = [ { id = "llama3.1:8b"; } ];
            };
          }
        '';
        description = ''
          Custom providers and models written to {file}`models.json` in
          {option}`programs.pi.configDir`.

          Left free-form deliberately: this file takes API keys, and pi
          resolves `$VAR` and `!command` references in it at request time.
          Pinning a schema here would break those indirections as pi adds
          provider shapes.
        '';
      };

      context = lib.mkOption {
        type = lib.types.either lib.types.lines lib.types.path;
        default = "";
        example = lib.literalExpression "./pi-context.md";
        description = ''
          Global agent context, written to {file}`AGENTS.md` in
          {option}`programs.pi.configDir`.

          Either inline text or a path to a file.
        '';
      };
    };

    config = lib.mkIf cfg.enable {
      assertions = [
        {
          assertion = cfg.package != null || cfg.extraPackages == [];
          message = "programs.pi.extraPackages requires programs.pi.package to be non-null; there is no binary to wrap.";
        }
      ];

      home.packages = let
        wrapped =
          if cfg.package != null && cfg.extraPackages != []
          then
            pkgs.symlinkJoin {
              inherit (cfg.package) meta;
              name = "${lib.getName cfg.package}-wrapped-${lib.getVersion cfg.package}";
              paths = [cfg.package];
              preferLocalBuild = true;
              nativeBuildInputs = [pkgs.makeWrapper];
              postBuild = ''
                wrapProgram $out/bin/pi \
                  --suffix PATH : ${lib.makeBinPath cfg.extraPackages}
              '';
            }
          else cfg.package;
      in
        lib.optional (wrapped != null) wrapped;

      home.sessionVariables = lib.mkIf (cfg.configDir != "${config.home.homeDirectory}/.pi/agent") {
        PI_CODING_AGENT_DIR = cfg.configDir;
      };

      # AGENTS.md is never written by pi, so it can be a normal (symlinked)
      # home file and stay strictly declarative.
      home.file = lib.mkIf (cfg.context != "") (
        if lib.isPath cfg.context
        then {"${cfg.configDir}/AGENTS.md".source = cfg.context;}
        else {"${cfg.configDir}/AGENTS.md".text = cfg.context;}
      );

      home.activation.piConfig = lib.mkIf (managedFiles != []) (
        lib.hm.dag.entryAfter ["writeBoundary"] installScript
      );
    };
  };
}
