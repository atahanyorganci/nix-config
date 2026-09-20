/**
 * Intermediate representation shared by the extractor and the Nix emitter.
 *
 * Keeping a neutral IR between "read TypeScript" and "write Nix" means the
 * emitter never touches a `ts.Type`, so it can be unit-tested against plain
 * data, and a second front end (e.g. the JSON Schema in models.json) can reuse
 * the same emitter.
 */

/** A Nix `lib.types` expression, described structurally rather than as text. */
export type NixType =
	| { kind: "bool" }
	| { kind: "str" }
	| { kind: "lines" }
	| { kind: "int" }
	| { kind: "number" }
	| { kind: "path" }
	/** `types.enum [ ... ]` — a closed set of string literals. */
	| { kind: "enum"; values: string[] }
	/** `types.ints.between lo hi` — used for numeric literal unions like `0 | 1`. */
	| { kind: "intBetween"; lo: number; hi: number }
	| { kind: "listOf"; of: NixType }
	| { kind: "attrsOf"; of: NixType }
	/** `types.either a b`, flattened to n-ary via nested `either`. */
	| { kind: "oneOf"; of: NixType[] }
	/** A nested option set, rendered as `types.submodule { options = ...; }`. */
	| { kind: "submodule"; options: OptionNode[] }
	/** Escape hatch for shapes too open to model; rendered as `types.anything`. */
	| { kind: "anything" };

/** One generated Nix option. */
export interface OptionNode {
	/** JSON key as pi reads it (not Nix-mangled). */
	name: string;
	/** Dotted path from the config root, used to join against the docs table. */
	path: string;
	type: NixType;
	/** Prose harvested from the upstream docs table, if any. */
	description?: string;
	/**
	 * Upstream default, rendered into the description rather than into
	 * `default`. See `emit.ts` for why every option defaults to null.
	 */
	upstreamDefault?: string;
	/** Literal Nix expression used for `example`, when one is worth showing. */
	example?: string;
}

/** Why a property was left out of the generated module. */
export type SkipReason = "runtime-state" | "machine-specific" | "denylisted";

export interface SkippedProperty {
	path: string;
	reason: SkipReason;
	note: string;
}

export interface ExtractionResult {
	/** Version of `@earendil-works/pi-coding-agent` the types were read from. */
	piVersion: string;
	options: OptionNode[];
	skipped: SkippedProperty[];
}

/**
 * Properties that exist in `interface Settings` but must never become
 * declarative options.
 *
 * Pi writes these itself at runtime; a Nix-managed value would either be
 * clobbered on the next write or would pin a value that is meant to drift
 * (`lastChangelogVersion` gates the post-update changelog, `trackingId` is a
 * generated analytics identifier). `trackingId` is additionally
 * machine-specific: sharing one across hosts would conflate their analytics.
 */
export const RUNTIME_STATE_PROPERTIES: Record<string, { reason: SkipReason; note: string }> = {
	lastChangelogVersion: {
		reason: "runtime-state",
		note: "written by pi after showing the changelog; pinning it suppresses or repeats the changelog",
	},
	trackingId: {
		reason: "machine-specific",
		note: "analytics identifier generated on first opt-in; must stay per-machine",
	},
};
