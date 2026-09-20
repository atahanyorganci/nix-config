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

| Option | Description |
| --- | --- |
| `enable` | Install pi and manage its configuration. |
| `package` | The pi package. Set to `null` to manage config without installing pi. |
| `extraPackages` | Extra programs on the wrapped `pi` binary's PATH (pi shells out to `npm`, and some packages need `bun` or `git`). |
| `configDir` | Where pi's configuration lives. Defaults to `~/.pi/agent`; `PI_CODING_AGENT_DIR` is exported automatically when changed. |
| `settings` | Typed settings written to `settings.json`. |
| `extraSettings` | Free-form settings merged over `settings`, for keys a newer pi supports. |
| `keybindings` | Typed keybindings written to `keybindings.json`. |
| `models` | Free-form custom providers and models written to `models.json`. |
| `context` | Global agent context written to `AGENTS.md`; inline text or a path. |

Unset options are omitted from the generated files entirely, so pi applies its
own defaults and project-level `.pi/settings.json` overrides still work. Each
option's documented default is recorded in its description rather than being
materialised as a Nix default, which would freeze whatever pi's default
happened to be when the options were generated.

### `settings` and `keybindings` are generated

Both come from pi's own `.d.ts` files, so they track the packaged version
exactly. Run `just pi-options` to regenerate them after bumping pi, and
`just pi-options-check` to assert the committed files still match.

`models` is deliberately *not* generated: it carries API keys and pi resolves
`$VAR` and `!command` indirections in it at request time, so a pinned schema
would break as upstream adds provider shapes.

## Files are copied, not symlinked

Pi rewrites `settings.json` while it runs — saving a startup model with
`Ctrl+S` in `/model`, changing options from `/settings`, and recording its own
changelog and analytics bookkeeping all write the file. A home-manager symlink
into the read-only Nix store makes those writes fail with `EACCES`, and pi
collects the error rather than surfacing it, so saves appear to succeed and
silently do nothing.

This module therefore *copies* managed files into `configDir` during
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
