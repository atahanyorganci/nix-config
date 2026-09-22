# model-profile

Per-model context budgets and fast-mode alternatives for pi.

Replaces [`magoz/pi-context-budget`](https://github.com/magoz/pi-context-budget),
adding a second axis and taking its configuration from Nix rather than a
hand-written JSON file. The context half follows the approach that extension
and [`@diegopetrucci/pi-context-cap`](https://github.com/diegopetrucci/pi-extensions)
established.

## Two axes

|                         | `/context`            | `/fast`                                             |
| ----------------------- | --------------------- | --------------------------------------------------- |
| Changes                 | `model.contextWindow` | the active model, and optionally its thinking level |
| Visible to the provider | no                    | yes                                                 |
| Scope                   | per model             | per session                                         |
| Persisted               | yes, per branch       | no                                                  |

`contextWindow` is local pi metadata: it drives footer reporting, overflow
handling, and the auto-compaction threshold (`contextTokens > contextWindow -
reserveTokens`), while requests still carry the unchanged model id. Lowering it
makes pi compact earlier, which is how you stay under a provider's long-context
pricing tier.

The axes are independent. Toggling fast mode preserves each model's context
profile, and changing the budget never alters routing.

## Commands

```text
/context              # picker
/context short        # select a profile
/context status       # active profile and effective window
/fast                 # toggle
/fast on | off
/fast status
```

`alt+shift+c` cycles context profiles, `alt+shift+f` toggles fast mode, and
`--fast` starts a session in fast mode. Both keys are configurable.

The footer shows `ctx:272k` when a model has profiles to switch between, plus
`⚡` while fast mode is on. A model with only a `fast` entry shows nothing until
fast mode is enabled — pi's own footer already reports context usage, so
repeating a fixed window would imply a control that does not exist.

## Behaviour

**Changes made while pi is streaming are deferred** to `agent_settled` and shown
as `pending`. Mutating `contextWindow` mid-turn would move the compaction
threshold under a request already in flight; switching models mid-turn would
change routing for one. Only the latest pending selection is applied, and it is
dropped if the model changed in the meantime.

**Shrinking past the threshold compacts automatically.** When a smaller budget
puts current usage above `contextWindow - reserveTokens`, compaction starts
without prompting; otherwise the session would sit overflowed until the next
turn, which the provider would then reject.

**Context profiles are branch-aware.** They are stored as custom session
entries, so they survive compaction, follow `/tree` navigation, and are excluded
from LLM context. Fast mode deliberately is not persisted: it is a transient
"be cheap for this next bit" switch, and restoring it on resume would route work
to the cheap model long after the reason had passed.

**A user-driven model change clears the fast restore target**, so `/fast off`
cannot yank you back to a model you deliberately navigated away from.

## Configuration

Declared through Nix as `programs.pi.modelProfiles`, which writes
`model-profile.json` into pi's config directory. In this repo the profiles are
derived from the gateway model list in `modules/home/agents.nix`, so a model
that changes its window updates both `models.json` and this file at once.

The file itself:

```json
{
	"shortcuts": { "context": "alt+shift+c", "fast": "alt+shift+f" },
	"models": {
		"llm-gateway/claude-code/claude-opus-5": {
			"defaultContext": "short",
			"context": { "short": 272000, "full": 1000000 },
			"fast": { "model": "claude-code/claude-sonnet-5", "thinkingLevel": "low" }
		}
	}
}
```

Models are keyed `"provider/modelId"`. `fast.provider` defaults to the primary's
provider. Each entry needs a `context` map, a `fast` entry, or both; a `context`
map needs at least two profiles, each an integer above `reserveTokens`, named
with lowercase letters, digits, dashes, or underscores, and not one of
`status`, `on`, `off`, or `toggle`.

`reserveTokens` is read from pi's own `compaction.reserveTokens` so the
compaction boundary matches the one pi uses, rather than duplicating the
default. It can be overridden per file.

A trusted project may layer `<project>/.pi/model-profile.json` over the global
file. Shortcuts are read from the global file only: pi registers shortcuts
before it resolves project trust, so honouring a project-local binding would let
an untrusted checkout claim a keybinding.
