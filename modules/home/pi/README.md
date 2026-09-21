# `programs.pi`

A home-manager module for [pi](https://pi.dev), with typed options generated
from the type definitions shipped inside the pi package itself.

Unlike a free-form JSON blob, every setting and keybinding is a real NixOS
option: invalid enum values, unknown setting names and typo'd keybinding ids
fail at evaluation time rather than being written to disk and rejected (or
silently ignored) by pi later.

## Usage

Add the flake that provides this module as an input and import
`homeManagerModules.pi`:

```nix
{
  inputs.pi-module.url = "github:owner/repo";

  outputs = { home-manager, pi-module, ... }: {
    homeConfigurations."alice" = home-manager.lib.homeManagerConfiguration {
      modules = [
        pi-module.modules.homeManager.pi
        {
          programs.pi = {
            enable = true;

            settings = {
              defaultProvider = "anthropic";
              defaultModel = "claude-sonnet-4-20250514";
              defaultThinkingLevel = "medium";
              theme = "dark";

              compaction = {
                enabled = true;
                keepRecentTokens = 20000;
              };

              terminal.showImages = true;
            };

            keybindings = {
              "tui.editor.cursorUp" = [ "up" "ctrl+p" ];
              "app.session.new" = "ctrl+n";
            };

            context = ''
              Prefer small, focused commits.
            '';
          };
        }
      ];
    };
  };
}
```

> [!NOTE]
> home-manager ships its own `programs.pi-coding-agent` module, which takes
> free-form JSON and symlinks it into place. The two use separate option
> namespaces and can be evaluated side by side, but both write the same files,
> so enable only one.

## Options

| Option          | Description                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `enable`        | Install pi and manage its configuration.                                                                             |
| `package`       | The pi package. Set to `null` to manage config without installing pi.                                                |
| `extraPackages` | Extra programs on the wrapped `pi` binary's PATH (pi shells out to `npm`, and some packages need `bun` or `git`).    |
| `configDir`     | Where pi's configuration lives. Defaults to `$XDG_CONFIG_HOME/pi/agent`; `PI_CODING_AGENT_DIR` is exported to match. |
| `sessionDir`    | Where session transcripts live. Defaults to `$XDG_STATE_HOME/pi/sessions`; `null` keeps them in `configDir`.         |
| `settings`      | Typed settings written to `settings.json`.                                                                           |
| `extraSettings` | Free-form settings merged over `settings`, for keys a newer pi supports.                                             |
| `keybindings`   | Typed keybindings written to `keybindings.json`.                                                                     |
| `models`        | Free-form custom providers and models written to `models.json`.                                                      |
| `extensions`    | Extensions linked into `configDir/extensions`, each `{ name; src; }`.                                                |
| `context`       | Global agent context written to `AGENTS.md`; inline text or a path.                                                  |
| `modelProfiles` | Context budgets and fast-mode pairs for the `model-profile` extension, written to `model-profile.json`.              |

## Extensions

Each entry becomes a symlink at `configDir/extensions/<name>`, which pi
auto-discovers. `src` is a path, so an in-tree directory and a
`fetchFromGitHub` result are declared the same way:

```nix
programs.pi.extensions = [
  {
    name = "my-tools";
    src = ../../packages/my-pi-extension;
  }
  {
    name = "context-budget";
    src = pkgs.fetchFromGitHub {
      owner = "magoz";
      repo = "pi-context-budget";
      rev = "...";
      sha256 = "...";
    };
  }
];
```

Pi finds a directory's entry point through its `package.json` `pi` manifest, or
failing that an `index.ts` beside it. A directory with neither is not loadable;
point `src` at the file itself instead.

### model-profile

`modelProfiles` configures the in-tree `model-profile` extension, which adds
switchable context budgets and a fast-mode model per model. It only writes the
configuration; the extension still has to be listed in `extensions`:

```nix
programs.pi = {
  extensions = [
    {
      name = "model-profile";
      src = "${pkgs.yorganci-pi-extension}/model-profile";
    }
  ];

  modelProfiles.models."llm-gateway/claude-opus-5" = {
    context = {
      short = 272000;
      full = 1000000;
    };
    defaultContext = "short";
    fast.model = "claude-sonnet-5";
  };
};
```

Models are keyed `"provider/modelId"`. Entries that end up empty are dropped, so
a model may configure either axis alone. Unlike the other JSON files this one is
symlinked rather than copied: it belongs to an extension that only ever reads
it, so nothing rewrites it at runtime.

See `packages/pi-extension/src/model-profile/README.md` for the extension's own
behaviour and the file format it accepts.

When `src` is a directory it is copied without `node_modules`, build caches or
tooling configs, so a workspace package can be pointed at directly. Dropping
`node_modules` matters: its entries are typically symlinks into a package
manager's store, and copying those into `/nix/store` leaves them dangling. Pi
bundles `@earendil-works/*` and `typebox` for extensions and resolves them
internally, so they belong in `peerDependencies` and must not be vendored.
A single-file `src` is passed through untouched.

## Directories

Pi has no XDG support: it puts everything in `~/.pi/agent` and offers two
environment overrides, `PI_CODING_AGENT_DIR` and `PI_CODING_AGENT_SESSION_DIR`.
This module defaults both to XDG locations and exports the variables, so pi and
Nix agree on where files live.

Sessions are split out because transcripts are regenerable history rather than
configuration, and they grow without bound.

Pi keeps some runtime state beside its configuration with no override of its
own: `auth.json` (credentials), `models-store.json`, and `trust.json`. Those
stay in `configDir` and are deliberately left unmanaged.

> [!NOTE]
> Changing `configDir` does not migrate an existing directory. Pi starts from
> empty state at the new location, so copy `auth.json` (and `sessions/`, if the
> history is worth keeping) across by hand before switching.

Unset options are omitted from the generated files entirely, so pi applies its
own defaults and project-level `.pi/settings.json` overrides still work. Each
option's documented default is recorded in its description rather than being
materialised as a Nix default, which would freeze whatever pi's default
happened to be when the options were generated.

### `settings` and `keybindings` are generated

Both come from pi's own `.d.ts` files, so they track the packaged version
exactly. Run `just pi-options` to regenerate them after bumping pi, and
`just pi-options-check` to assert the committed files still match.

The files under `generated/` are themselves flake-parts modules contributing to
`flake.modules.homeManager.pi`, so they are discovered by the same auto-import
as every other module in the tree. Option declarations for one path merge
across modules, which lets the generated files declare the typed sub-options of
`settings` and `keybindings` while `default.nix` declares those same options'
descriptions and defaults, and everything else the module does.

`models` is deliberately _not_ generated: it carries API keys and pi resolves
`$VAR` and `!command` indirections in it at request time, so a pinned schema
would break as upstream adds provider shapes.

## Files are copied, not symlinked

Pi rewrites `settings.json` while it runs — saving a startup model with
`Ctrl+S` in `/model`, changing options from `/settings`, and recording its own
changelog and analytics bookkeeping all write the file. A home-manager symlink
into the read-only Nix store makes those writes fail with `EACCES`, and pi
collects the error rather than surfacing it, so saves appear to succeed and
silently do nothing.

This module therefore _copies_ managed files into `configDir` during
activation. Because a copy can also be edited outside Nix, each managed file
gets a sidecar checksum under `configDir/.hm-state` recording what Nix last
wrote:

- unchanged since the last activation → overwritten with the new content;
- modified since (by you or by pi) → left in place, and the new content is
  written alongside as `<file>.hm-new`.

So activation never silently discards a setting you or pi just saved. If you
see a `.hm-new` file, reconcile it and delete it.

`AGENTS.md` is never written by pi, so it stays a normal (symlinked,
strictly declarative) home file.

## Settings pi manages itself

Some keys in pi's settings type are deliberately not exposed as options:

- `lastChangelogVersion` — written by pi after it shows the changelog;
  pinning it would suppress or repeat the changelog forever.
- `trackingId` — an analytics identifier generated on first opt-in, which
  must stay per-machine.

Both are runtime state rather than configuration. They are listed in the
header of the generated options file.
