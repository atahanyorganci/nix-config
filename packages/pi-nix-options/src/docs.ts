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
		const cells = trimmed
			.slice(1, trimmed.endsWith("|") ? -1 : undefined)
			.split("|")
			.map(cell => cell.trim());
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
			...(defaultText === "" || defaultText === "-" ? {} : { default: defaultText }),
			description: stripInlineMarkup(rest.join(" | ")),
		});
	}
	return entries;
};

/** Parse the keybindings table into id → default-keys prose. */
export const parseKeybindingDocs = (markdown: string): Map<string, DocsEntry> => parseSettingsDocs(markdown);
