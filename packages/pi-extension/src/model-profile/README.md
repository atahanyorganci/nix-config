# model-profile

Per-model context budgets and the provider's fast path for pi.

Replaces [`magoz/pi-context-budget`](https://github.com/magoz/pi-context-budget),
adding a second axis and taking its configuration from Nix rather than a
hand-written JSON file. The context half follows the approach that extension
and [`@diegopetrucci/pi-context-cap`](https://github.com/diegopetrucci/pi-extensions)
established.

## Two axes

|                         | `/context`            | `/fast`                                                |
| ----------------------- | --------------------- | ------------------------------------------------------ |
| Changes                 | `model.contextWindow` | `service_tier: "priority"` on each request, same model |
| Visible to the provider | no                    | yes                                                    |
| Scope                   | per model             | per session, applied to every model configured for it  |
| Persisted               | yes, per branch       | no                                                     |

`contextWindow` is local pi metadata: it drives footer reporting, overflow
handling, and the auto-compaction threshold (`contextTokens > contextWindow -
reserveTokens`), while requests still carry the unchanged model id. Lowering it
makes pi compact earlier, which is how you stay under a provider's long-context
pricing tier.

Fast mode asks the provider for its faster, pricier path on the same model.
The `llm-gateway` maps `service_tier: "priority"` to Codex priority processing
and Claude `speed: "fast"`. Only models the config marks with `fast: true`
get it, and only over the `openai-completions` and `openai-responses` APIs,
whose request body has that field.

The axes are independent: neither changes the model, and each leaves the
other's setting alone.

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
`⚡` while fast mode applies, or `⚡ n/a` while it is on but the active model has
no fast path. A model with only `fast: true` shows nothing until fast mode is
enabled — pi's own footer already reports context usage, so repeating a fixed
window would imply a control that does not exist.

## Behaviour

**Context changes made while pi is streaming are deferred** to `agent_settled`
and shown as `pending`. Mutating `contextWindow` mid-turn would move the
compaction threshold under a request already in flight. Only the latest pending
selection is applied, and it is dropped if the model changed in the meantime.

**Fast mode takes effect from the next request**, even mid-turn: the tier is
added to each request as it is sent, so nothing in flight changes. On Claude,
switching speed invalidates the prompt cache, so toggling mid-session costs one
cache rebuild. Compaction and branch summaries are always sent at standard
speed: pi does not route them through the request hook.

**Fast responses are priced at the model's fast rate.** Pi prices responses
from the model's standard rates, so the extension scales the recorded cost of
every response sent fast by `fastCostMultiplier`, 2 unless the model says
otherwise. Anthropic's fast mode and OpenAI's on GPT-5.6 and GPT-6 are 2× the
standard rate; GPT-5.5's is 2.5×. Codex subscriptions burn their included limits
at their own rates, which the `usage` widget shows.

**Fast-mode failures are read from the error message.** The gateway starts
each one with its code, the only part of a streamed error pi keeps:

- `fast_mode_unsupported` and `fast_mode_credits_required` turn fast mode off,
  since every later request would fail the same way.
- `fast_mode_rate_limited` leaves it on with a warning. Pi retries it by
  itself, and `/fast off` continues at standard speed.

**Shrinking past the threshold compacts automatically.** When a smaller budget
puts current usage above `contextWindow - reserveTokens`, compaction starts
without prompting; otherwise the session would sit overflowed until the next
turn, which the provider would then reject.

**Context profiles are branch-aware.** They are stored as custom session
entries, so they survive compaction, follow `/tree` navigation, and are excluded
from LLM context. Fast mode deliberately is not persisted: it costs a multiple
of the standard rate, and restoring it on resume would keep paying that long
after the reason had passed.

**Fast mode follows the session across model changes.** It can only be turned
on while the active model offers it, and it then applies to whichever active
model does.

## Configuration

Declared through Nix as `programs.pi.modelProfiles`, which writes
`model-profile.json` into pi's config directory. In this repo the profiles are
derived from the gateway model list in `modules/home/agents.nix`: each price
break (`inputTokensAbove`) below the window becomes a profile named by its size,
plus `full`, starting on the lowest. A model with flat pricing gets none, and a
change to a model's window or tiers updates both `models.json` and this file.

The file itself:

```json
{
	"shortcuts": { "context": "alt+shift+c", "fast": "alt+shift+f" },
	"models": {
		"llm-gateway/codex/gpt-5.5": {
			"defaultContext": "272k",
			"context": { "272k": 272000, "full": 1050000 },
			"fast": true,
			"fastCostMultiplier": 2.5
		}
	}
}
```

Models are keyed `"provider/modelId"`. Each entry needs a `context` map,
`"fast": true`, or both; `fastCostMultiplier` (at least 1) is only allowed with
`"fast": true`; a `context`
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
