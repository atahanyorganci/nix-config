/**
 * Harvests descriptions and stated defaults from pi's `docs/settings.md`.
 *
 * Only prose comes from here. The set of options and their types come from the
 * `.d.ts` files, because the docs table is incomplete: it has no row for
 * `showTerminalProgress` or `lastChangelogVersion`. Treating the docs as
 * authoritative would silently drop real settings.
 */

export interface DocsEntry {
	/** Dotted key as written in the docs table, e.g. `compaction.enabled`. */
	path: string;
	type: string;
	default?: string;
	description: string;
}

/** Strip the markdown inline code/emphasis that would be noise in Nix docs. */
const stripInlineMarkup = (value: string): string =>
	value
		.replace(/`([^`]*)`/g, "$1")
		.replace(/\*\*([^*]*)\*\*/g, "$1")
		.replace(/\*([^*]*)\*/g, "$1")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.trim();

/**
 * Split a markdown table row into trimmed cells.
 *
 * GFM treats `\|` as a literal pipe inside a cell (pi's docs write unions as
 * `"a" \| "b"`), so only unescaped pipes delimit cells.
 */
const splitTableRow = (row: string): string[] => {
	const inner = row.slice(1, row.endsWith("|") && !row.endsWith("\\|") ? -1 : undefined);
	return inner.split(/(?<!\\)\|/).map(cell => cell.replace(/\\\|/g, "|").trim());
};

/** Default-column values that mean "no default", rather than a literal value. */
const isNoDefault = (text: string): boolean => ["", "-", "(none)", "none"].includes(text.toLowerCase());

/**
 * Parse every `| \`key\` | type | default | description |` row.
 *
 * The docs use one table per section with a stable four-column shape, so a
 * line-oriented parse is sufficient and avoids a markdown dependency.
 */
export const parseSettingsDocs = (markdown: string): Map<string, DocsEntry> => {
	const entries = new Map<string, DocsEntry>();
	for (const line of markdown.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("|")) {
			continue;
		}
		const cells = splitTableRow(trimmed);
		if (cells.length < 4) {
			continue;
		}
		const [rawKey, rawType, rawDefault, ...rest] = cells;
		if (rawKey === undefined || rawType === undefined || rawDefault === undefined) {
			continue;
		}
		// Only rows whose first cell is a single inline-code key are settings.
		const keyMatch = /^`([A-Za-z][A-Za-z0-9.]*)`$/.exec(rawKey);
		if (keyMatch?.[1] === undefined) {
			continue;
		}
		// Skip separator rows and the header itself.
		if (/^-+$/.test(rawType)) {
			continue;
		}
		const defaultText = stripInlineMarkup(rawDefault);
		entries.set(keyMatch[1], {
			path: keyMatch[1],
			type: stripInlineMarkup(rawType),
			...(isNoDefault(defaultText) ? {} : { default: defaultText }),
			description: stripInlineMarkup(rest.join(" | ")),
		});
	}
	return entries;
};

/**
 * Parse the keybindings tables into id → default-keys prose.
 *
 * These tables have three columns (id | default | description) rather than the
 * four of the settings tables, so they need their own parse.
 */
export const parseKeybindingDocs = (markdown: string): Map<string, DocsEntry> => {
	const entries = new Map<string, DocsEntry>();
	for (const line of markdown.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("|")) {
			continue;
		}
		const cells = splitTableRow(trimmed);
		if (cells.length < 3) {
			continue;
		}
		const [rawKey, rawDefault, ...rest] = cells;
		if (rawKey === undefined || rawDefault === undefined) {
			continue;
		}
		const keyMatch = /^`([a-z][A-Za-z0-9.]*)`$/.exec(rawKey);
		if (keyMatch?.[1] === undefined) {
			continue;
		}
		// "*(none)*" (older docs) or "None" marks an action that ships with no
		// default binding.
		const defaultText = stripInlineMarkup(rawDefault);
		entries.set(keyMatch[1], {
			path: keyMatch[1],
			type: "keys",
			...(isNoDefault(defaultText) ? {} : { default: defaultText }),
			description: stripInlineMarkup(rest.join(" | ")),
		});
	}
	return entries;
};
