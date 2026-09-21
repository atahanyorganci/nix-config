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

    # The extension validates its own config and rejects a model entry that
    # defines neither axis, so drop the empty `context` attrsets the option's
    # defaults produce rather than writing a file pi would then reject.
    modelProfilesJson = let
      profiles = stripNulls cfg.modelProfiles;
      prune = lib.filterAttrs (_: model: model != {});
      models = prune (lib.mapAttrs (_: model: lib.filterAttrs (_: value: value != {}) model) (profiles.models or {}));
    in
      lib.optionalAttrs (profiles ? shortcuts && profiles.shortcuts != {}) {
        inherit (profiles) shortcuts;
      }
      // lib.optionalAttrs (models != {}) {inherit models;};

    hasSettings = settingsJson != {};
    hasKeybindings = keybindingsJson != {};
    hasModels = cfg.models != {};
    hasModelProfiles = (modelProfilesJson.models or {}) != {};

    settingsFile = jsonFormat.generate "pi-settings.json" settingsJson;
    keybindingsFile = jsonFormat.generate "pi-keybindings.json" keybindingsJson;
    modelsFile = jsonFormat.generate "pi-models.json" cfg.models;
    modelProfilesFile = jsonFormat.generate "pi-model-profile.json" modelProfilesJson;

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

    # Extension sources are handed to pi as-is, minus the things a checked-out
    # workspace carries that pi must not see:
    #
    #   - node_modules, whose entries are usually symlinks into a package
    #     manager's store. Copied into /nix/store they dangle, and a dangling
    #     node_modules/@scope/pkg shadows the copy pi resolves internally.
    #   - build caches and tooling configs, which are pure closure bloat.
    #
    # A single file is passed straight through: there is nothing to prune, and
    # copying it into a directory would change how pi resolves it.
    cleanExtension = extension:
      if !(lib.pathIsDirectory extension.src)
      then extension.src
      else
        pkgs.runCommand "pi-extension-${lib.strings.sanitizeDerivationName extension.name}" {
          src = extension.src;
          preferLocalBuild = true;
        } ''
          cp -R "$src" "$out"
          chmod -R u+w "$out"
        '';

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
        default = "${config.xdg.configHome}/pi/agent";
        defaultText = lib.literalExpression ''"''${config.xdg.configHome}/pi/agent"'';
        example = lib.literalExpression ''"''${config.home.homeDirectory}/.pi/agent"'';
        description = ''
          Directory holding pi's configuration.

          Pi itself defaults to {file}`~/.pi/agent` and has no XDG support, so
          this defaults to the XDG location instead and exports
          {env}`PI_CODING_AGENT_DIR` to point the CLI at it.

          Pi also keeps runtime state here that cannot be relocated on its own:
          {file}`auth.json`, {file}`models-store.json` and {file}`trust.json`.
          Only sessions have a separate override, see
          {option}`programs.pi.sessionDir`.
        '';
      };

      sessionDir = lib.mkOption {
        type = lib.types.nullOr lib.types.str;
        default = "${config.xdg.stateHome}/pi/sessions";
        defaultText = lib.literalExpression ''"''${config.xdg.stateHome}/pi/sessions"'';
        example = lib.literalExpression ''"''${config.xdg.dataHome}/pi/sessions"'';
        description = ''
          Directory holding recorded sessions, exported as
          {env}`PI_CODING_AGENT_SESSION_DIR`.

          Transcripts are regenerable history rather than configuration, so
          they default to the XDG state directory instead of sitting in
          {option}`programs.pi.configDir`. Set to `null` to leave them there.
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

      extensions = lib.mkOption {
        type = lib.types.listOf (lib.types.submodule {
          options = {
            name = lib.mkOption {
              type = lib.types.str;
              example = "context-budget";
              description = ''
                Name of the extension.

                Becomes the entry's filename under
                {file}`''${configDir}/extensions`, so it must be unique and
                should carry a `.ts` suffix when {option}`src` is a single
                file.
              '';
            };

            src = lib.mkOption {
              type = lib.types.path;
              example = lib.literalExpression ''
                pkgs.fetchFromGitHub {
                  owner = "magoz";
                  repo = "pi-context-budget";
                  rev = "...";
                  sha256 = "...";
                }
              '';
              description = ''
                Path to the extension.

                A local path and a fetched derivation are both just paths, so
                remote and in-tree extensions are declared the same way.

                Pi loads a directory through its {file}`package.json` `pi`
                manifest, or failing that an {file}`index.ts` beside it. A
                directory holding neither is not loadable: point {option}`src`
                at the file itself instead.
              '';
            };
          };
        });
        default = [];
        example = lib.literalExpression ''
          [
            {
              name = "my-extension.ts";
              src = ./my-extension.ts;
            }
          ]
        '';
        description = ''
          Extensions linked into {file}`''${configDir}/extensions`, which pi
          auto-discovers.

          Preferred over listing paths in {option}`settings.packages`: that
          would put store paths inside {file}`settings.json`, and every edit
          to an extension would then change a file pi also writes to at
          runtime.
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

      modelProfiles = lib.mkOption {
        type = lib.types.submodule {
          options = {
            shortcuts = lib.mkOption {
              type = lib.types.submodule {
                options = {
                  context = lib.mkOption {
                    type = lib.types.nullOr lib.types.str;
                    default = null;
                    example = "alt+shift+c";
                    description = "Key cycling the active model's context profile.";
                  };
                  fast = lib.mkOption {
                    type = lib.types.nullOr lib.types.str;
                    default = null;
                    example = "alt+shift+f";
                    description = "Key toggling fast mode.";
                  };
                };
              };
              default = {};
              description = "Keys bound by the extension. Unset keys keep its defaults.";
            };

            models = lib.mkOption {
              type = lib.types.attrsOf (lib.types.submodule {
                options = {
                  defaultContext = lib.mkOption {
                    type = lib.types.nullOr lib.types.str;
                    default = null;
                    description = ''
                      Context profile new sessions start on. Defaults to the
                      first entry of {option}`context`.
                    '';
                  };

                  context = lib.mkOption {
                    type = lib.types.attrsOf lib.types.ints.positive;
                    default = {};
                    example = lib.literalExpression ''{ short = 200000; full = 1000000; }'';
                    description = ''
                      Selectable context windows in tokens, keyed by profile
                      name. At least two are needed for switching to mean
                      anything.

                      This is local pi metadata driving footer reporting and
                      the auto-compaction threshold; requests still carry the
                      unchanged model id.
                    '';
                  };

                  fast = lib.mkOption {
                    type = lib.types.nullOr (lib.types.submodule {
                      options = {
                        provider = lib.mkOption {
                          type = lib.types.nullOr lib.types.str;
                          default = null;
                          description = "Defaults to the primary model's provider.";
                        };
                        model = lib.mkOption {
                          type = lib.types.str;
                          description = "Model id to switch to in fast mode.";
                        };
                        thinkingLevel = lib.mkOption {
                          type = lib.types.nullOr (lib.types.enum [
                            "off"
                            "minimal"
                            "low"
                            "medium"
                            "high"
                            "xhigh"
                            "max"
                          ]);
                          default = null;
                          description = "Thinking level for fast mode. Unset keeps the current level.";
                        };
                      };
                    });
                    default = null;
                    description = "Cheaper, quicker model `/fast` switches to.";
                  };
                };
              });
              default = {};
              example = lib.literalExpression ''
                {
                  "llm-gateway/claude-opus-5" = {
                    context = { short = 200000; full = 1000000; };
                    fast.model = "claude-haiku-4-5-20251001";
                  };
                }
              '';
              description = ''
                Per-model profiles keyed by `"provider/modelId"`.
              '';
            };
          };
        };
        default = {};
        description = ''
          Configuration for the `model-profile` extension, written to
          {file}`model-profile.json` in {option}`programs.pi.configDir`.

          Only written when {option}`models` is non-empty. The extension
          itself still has to be listed in {option}`programs.pi.extensions`;
          this option only supplies its configuration.
        '';
      };
    };

    config = lib.mkIf cfg.enable {
      assertions = [
        {
          assertion = cfg.package != null || cfg.extraPackages == [];
          message = "programs.pi.extraPackages requires programs.pi.package to be non-null; there is no binary to wrap.";
        }
        {
          # Names become filenames in one directory, so duplicates would have
          # one extension silently shadow another.
          assertion = let
            names = map (extension: extension.name) cfg.extensions;
          in
            lib.length (lib.unique names) == lib.length names;
          message = let
            names = map (extension: extension.name) cfg.extensions;
            duplicates = lib.unique (lib.filter (name: lib.count (other: other == name) names > 1) names);
          in "programs.pi.extensions has duplicate names: ${lib.concatStringsSep ", " duplicates}.";
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

      # Pi resolves its own directories from these, so they have to be set for
      # the CLI to find anything Nix wrote.
      home.sessionVariables =
        lib.optionalAttrs (cfg.configDir != "${config.home.homeDirectory}/.pi/agent") {
          PI_CODING_AGENT_DIR = cfg.configDir;
        }
        // lib.optionalAttrs (cfg.sessionDir != null) {
          PI_CODING_AGENT_SESSION_DIR = cfg.sessionDir;
        };

      # Pi only ever reads these, so unlike the JSON files they can stay
      # strictly declarative as symlinks into the store.
      #
      # model-profile.json belongs here rather than in `managedFiles`: it is
      # owned by an extension that only ever reads it, so nothing rewrites it
      # at runtime and a read-only store symlink costs nothing.
      home.file =
        lib.optionalAttrs hasModelProfiles {
          "${cfg.configDir}/model-profile.json".source = modelProfilesFile;
        }
        // lib.optionalAttrs (cfg.context != "") (
          if lib.isPath cfg.context
          then {"${cfg.configDir}/AGENTS.md".source = cfg.context;}
          else {"${cfg.configDir}/AGENTS.md".text = cfg.context;}
        )
        // lib.listToAttrs (map (extension:
          lib.nameValuePair "${cfg.configDir}/extensions/${extension.name}" {
            source = cleanExtension extension;
          })
        cfg.extensions);

      home.activation.piConfig = lib.mkIf (managedFiles != []) (
        lib.hm.dag.entryAfter ["writeBoundary"] installScript
      );
    };
  };
}
