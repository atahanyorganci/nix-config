/**
 * Reading the gateway's `/_/usage` response into widget rows.
 *
 * The response is keyed by `provider:account`. A successful entry's `data` is
 * a provider report, `{ usage, resets, credits }`:
 *
 * - `usage` -- limit windows keyed by a provider-specific name, `used` 0 to 1;
 * - `resets` -- banked usage-limit resets, `{ available, total, expiresAt }`;
 * - `credits` -- pay-as-you-go usage, `{ unit, available, used }`.
 *
 * Failed entries, `{ success: false, error }`, are skipped: one account being
 * unreachable should not hide the others.
 */

export type UsageWindow = {
	used: number;
	resetAt: string | null;
};

export type Reset = {
	available: number;
	total: number | null;
	expiresAt: string | null;
};

export type Credit = {
	unit: string;
	available: number | null;
	used: number | null;
};

export type ProviderReport = {
	usage: Record<string, UsageWindow>;
	resets: Reset[];
	credits: Credit[];
};

/** One limit window, drawn as a bar. */
export type WindowRow = UsageWindow & {
	kind: "window";
	label: string;
};

/** An account's banked resets and credits, drawn as text after its windows. */
export type ExtrasRow = Pick<ProviderReport, "resets" | "credits"> & {
	kind: "extras";
	label: string;
};

export type UsageRow = WindowRow | ExtrasRow;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const nullableNumber = (value: unknown): number | null => (isFiniteNumber(value) ? value : null);

const nullableString = (value: unknown): string | null => (typeof value === "string" ? value : null);

function humanize(value: string): string {
	return value.replaceAll("_", " ");
}

function parseWindows(value: unknown): Record<string, UsageWindow> {
	if (!isRecord(value)) return {};
	const windows: Record<string, UsageWindow> = {};
	for (const [name, window] of Object.entries(value)) {
		if (!isRecord(window) || !isFiniteNumber(window.used)) continue;
		windows[name] = {
			used: Math.max(0, Math.min(1, window.used)),
			resetAt: nullableString(window.resetAt),
		};
	}
	return windows;
}

function parseResets(value: unknown): Reset[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((reset): Reset[] =>
		isRecord(reset) && isFiniteNumber(reset.available)
			? [{ available: reset.available, total: nullableNumber(reset.total), expiresAt: nullableString(reset.expiresAt) }]
			: [],
	);
}

function parseCredits(value: unknown): Credit[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((credit): Credit[] =>
		isRecord(credit) && typeof credit.unit === "string"
			? [{ unit: credit.unit, available: nullableNumber(credit.available), used: nullableNumber(credit.used) }]
			: [],
	);
}

/** Decodes the response leniently: a malformed part is dropped, not fatal. */
export function parseReports(value: unknown): Map<string, ProviderReport> {
	if (!isRecord(value)) throw new Error("invalid response");

	const reports = new Map<string, ProviderReport>();
	for (const [provider, result] of Object.entries(value)) {
		if (!isRecord(result) || result.success !== true || !isRecord(result.data)) continue;
		reports.set(provider, {
			usage: parseWindows(result.data.usage),
			resets: parseResets(result.data.resets),
			credits: parseCredits(result.data.credits),
		});
	}
	return reports;
}

export function formatDuration(at: string | null, now = Date.now()): string | undefined {
	if (!at) return undefined;
	const milliseconds = new Date(at).getTime() - now;
	if (Number.isNaN(milliseconds)) return undefined;
	if (milliseconds <= 0) return "now";

	const totalMinutes = Math.ceil(milliseconds / 60_000);
	const days = Math.floor(totalMinutes / 1_440);
	const hours = Math.floor((totalMinutes % 1_440) / 60);
	const minutes = totalMinutes % 60;

	if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
	if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
	return `${minutes}m`;
}

export function formatReset(reset: Reset, now = Date.now()): string {
	const showTotal = reset.total !== null && reset.total !== reset.available;
	const of = showTotal ? ` of ${reset.total}` : "";
	const noun = (showTotal ? reset.total : reset.available) === 1 ? "reset" : "resets";
	const expiry = formatDuration(reset.expiresAt, now);
	return `${reset.available}${of} ${noun}${expiry ? ` (expires in ${expiry})` : ""}`;
}

/** `unit` is an ISO currency code, or `credits` for a plain count. */
export function formatAmount(amount: number, unit: string): string {
	if (unit === "credits") {
		return `${amount.toLocaleString("en", { maximumFractionDigits: 2 })} ${amount === 1 ? "credit" : "credits"}`;
	}
	try {
		return amount.toLocaleString("en", { style: "currency", currency: unit });
	} catch {
		// Not a currency `Intl` knows; show the unit as the provider gave it.
		return `${amount.toLocaleString("en", { maximumFractionDigits: 2 })} ${unit}`;
	}
}

export function formatCredit(credit: Credit): string | undefined {
	const parts: string[] = [];
	if (credit.available !== null) parts.push(`${formatAmount(credit.available, credit.unit)} left`);
	if (credit.used !== null) parts.push(`${formatAmount(credit.used, credit.unit)} used`);
	return parts.length > 0 ? parts.join(", ") : undefined;
}

/** The account's resets and credits as one line, or nothing when it has neither. */
export function formatExtras(report: Pick<ProviderReport, "resets" | "credits">, now = Date.now()): string | undefined {
	const parts = [
		...report.resets.filter(reset => reset.available > 0).map(reset => formatReset(reset, now)),
		...report.credits.flatMap(credit => formatCredit(credit) ?? []),
	];
	return parts.length > 0 ? parts.join("  ·  ") : undefined;
}

/** Each account's windows, followed by a line for its resets and credits. */
export function toRows(reports: Map<string, ProviderReport>): UsageRow[] {
	const rows: UsageRow[] = [];
	for (const [provider, report] of reports) {
		for (const [name, window] of Object.entries(report.usage)) {
			rows.push({ kind: "window", label: `${humanize(provider)} ${humanize(name)}`, ...window });
		}
		// Expiries are formatted when drawn, so only check there is something to draw.
		if (formatExtras(report) !== undefined) {
			rows.push({ kind: "extras", label: humanize(provider), resets: report.resets, credits: report.credits });
		}
	}
	return rows;
}

export function parseRows(value: unknown): UsageRow[] {
	const rows = toRows(parseReports(value));
	if (rows.length === 0) throw new Error("response contained no usage data");
	return rows;
}
