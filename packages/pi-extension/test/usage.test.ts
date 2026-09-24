import { describe, expect, it } from "vitest";
import { formatAmount, formatExtras, formatReset, parseReports, parseRows } from "../src/usage/report.ts";

const now = Date.parse("2026-09-24T10:00:00.000Z");

/** The shape `/_/usage` returns, taken from a live gateway. */
const response = {
	"codex:oat": {
		success: true,
		data: {
			usage: { primary: { used: 0.33, resetAt: "2026-09-30T19:14:21.000Z" } },
			resets: [{ available: 1, total: 1, expiresAt: "2026-10-22T20:25:27.648Z" }],
			credits: [{ unit: "credits", available: 0, used: null }],
		},
	},
	"claude-code:rc": {
		success: true,
		data: {
			usage: {
				session: { used: 0, resetAt: null },
				weekly_fable: { used: 0.54, resetAt: "2026-09-24T20:00:01.487Z" },
			},
			resets: [],
			credits: [{ unit: "USD", available: 1, used: 0 }],
		},
	},
	"codex:work": { success: false, error: "Codex usage request returned 401: token_expired" },
};

describe("parsing", () => {
	it("reads windows from data.usage, not data", () => {
		const reports = parseReports(response);
		expect(Object.keys(reports.get("codex:oat")?.usage ?? {})).toEqual(["primary"]);
		expect(reports.get("claude-code:rc")?.usage.weekly_fable).toEqual({
			used: 0.54,
			resetAt: "2026-09-24T20:00:01.487Z",
		});
	});

	it("skips failed providers", () => {
		expect(parseReports(response).has("codex:work")).toBe(false);
	});

	it("follows each account's windows with one extras row", () => {
		expect(parseRows(response).map(row => `${row.kind} ${row.label}`)).toEqual([
			"window codex:oat primary",
			"extras codex:oat",
			"window claude-code:rc session",
			"window claude-code:rc weekly fable",
			"extras claude-code:rc",
		]);
	});

	it("drops a malformed reset or credit without losing the windows", () => {
		const reports = parseReports({
			a: {
				success: true,
				data: {
					usage: { w: { used: 2, resetAt: null } },
					resets: [{ total: 1 }, { available: 2, total: "x", expiresAt: 5 }],
					credits: "none",
				},
			},
		});
		expect(reports.get("a")).toEqual({
			usage: { w: { used: 1, resetAt: null } },
			resets: [{ available: 2, total: null, expiresAt: null }],
			credits: [],
		});
	});

	it("still rejects a response with nothing to show", () => {
		expect(() => parseRows({ a: { success: false, error: "x" } })).toThrow("no usage data");
		expect(() => parseRows(null)).toThrow("invalid response");
	});
});

describe("formatting", () => {
	it("describes resets with their expiry", () => {
		expect(formatReset({ available: 1, total: 1, expiresAt: "2026-09-26T13:00:00.000Z" }, now)).toBe(
			"1 reset (expires in 2d 3h)",
		);
		expect(formatReset({ available: 1, total: 3, expiresAt: null }, now)).toBe("1 of 3 resets");
	});

	it("renders currencies as money and credits as a count", () => {
		expect(formatAmount(1, "USD")).toBe("$1.00");
		expect(formatAmount(1, "credits")).toBe("1 credit");
		expect(formatAmount(2.5, "credits")).toBe("2.5 credits");
		expect(formatAmount(3, "ZZZZ")).toBe("3 ZZZZ");
	});

	it("omits whatever the provider did not report", () => {
		expect(formatExtras({ resets: [], credits: [{ unit: "USD", available: null, used: 0 }] }, now)).toBe("$0.00 used");
		expect(formatExtras({ resets: [], credits: [{ unit: "USD", available: null, used: null }] }, now)).toBe(undefined);
		expect(formatExtras({ resets: [{ available: 0, total: 1, expiresAt: null }], credits: [] }, now)).toBe(undefined);
	});
});
