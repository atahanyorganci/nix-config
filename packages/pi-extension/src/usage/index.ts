import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { formatDuration, formatExtras, parseRows } from "./report.ts";
import type { UsageRow, WindowRow } from "./report.ts";
import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";

// Matches the gateway the models are served from. `PI_USAGE_ENDPOINT` overrides
// it so the widget follows a gateway that is not on the default port.
const ENDPOINT = process.env.PI_USAGE_ENDPOINT ?? "http://localhost:3000/_/usage";
const WIDGET_ID = "local-usage";
const MIN_BAR_WIDTH = 6;
const MAX_BAR_WIDTH = 30;

function progressBar(used: number, width: number): string {
	const filled = Math.round(used * width);
	return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

function usageColor(used: number): "accent" | "warning" | "error" {
	if (used >= 0.95) return "error";
	if (used >= 0.8) return "warning";
	return "accent";
}

function renderRows(allRows: UsageRow[], width: number, theme: Theme): string[] {
	if (width <= 0) return [];

	// Bars are sized from the window rows alone; extras rows are free text that
	// only shares the label column, and is truncated to whatever width is left.
	const rows = allRows.filter((row): row is WindowRow => row.kind === "window");
	const now = Date.now();
	const percentages = rows.map(row => `${Math.round(row.used * 100)}`.padStart(3) + "%");
	const resetDurations = rows.map(row => formatDuration(row.resetAt, now));
	const fullResets = resetDurations.map(duration => (duration ? `  ·  resets in ${duration}` : ""));
	const shortResets = resetDurations.map(duration => (duration ? ` · ${duration}` : ""));
	const longestLabel = Math.max(0, ...allRows.map(row => visibleWidth(row.label)));

	let resets = fullResets;
	let resetWidth = Math.max(0, ...resets.map(visibleWidth));
	let labelWidth = longestLabel;
	// Two spaces after the label, one after the bar, and four for "100%".
	const chromeWidth = 2 + 1 + 4;
	let barWidth = width - labelWidth - chromeWidth - resetWidth;

	if (barWidth < MIN_BAR_WIDTH) {
		resets = shortResets;
		resetWidth = Math.max(0, ...resets.map(visibleWidth));
		barWidth = width - labelWidth - chromeWidth - resetWidth;
	}

	if (barWidth < MIN_BAR_WIDTH) {
		resets = rows.map(() => "");
		resetWidth = 0;
		barWidth = width - labelWidth - chromeWidth;
	}

	if (barWidth < MIN_BAR_WIDTH) {
		labelWidth = Math.max(1, width - MIN_BAR_WIDTH - chromeWidth);
		barWidth = width - labelWidth - chromeWidth;
	}

	barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, barWidth));

	const padLabel = (text: string): string => {
		const label = truncateToWidth(text, labelWidth, "…");
		return label + " ".repeat(Math.max(0, labelWidth - visibleWidth(label)));
	};

	return allRows.map(row => {
		if (row.kind === "extras") {
			const line = `${theme.fg("muted", padLabel(row.label))}  ${theme.fg("dim", formatExtras(row, now) ?? "")}`;
			return truncateToWidth(line, width, "…");
		}
		const index = rows.indexOf(row);
		const line =
			`${theme.fg("muted", padLabel(row.label))}  ` +
			`${theme.fg(usageColor(row.used), progressBar(row.used, barWidth))} ` +
			`${theme.fg("text", percentages[index] ?? "  ?%")}` +
			`${theme.fg("dim", resets[index] ?? "")}`;
		return truncateToWidth(line, width, "");
	});
}

export default function usageExtension(pi: ExtensionAPI): void {
	let visible = false;
	let rows: UsageRow[] = [];
	let error: string | undefined;
	let loading = false;
	let activeTui: TUI | undefined;
	let activeRequest: AbortController | undefined;
	let requestGeneration = 0;

	const requestRender = () => activeTui?.requestRender();

	const installWidget = (ctx: ExtensionContext) => {
		if (!ctx.hasUI || !visible) {
			ctx.ui.setWidget(WIDGET_ID, undefined);
			return;
		}

		ctx.ui.setWidget(
			WIDGET_ID,
			(tui, theme): Component & { dispose(): void } => {
				activeTui = tui;
				return {
					render(width: number): string[] {
						if (rows.length > 0) return renderRows(rows, width, theme);
						const message = loading ? "Fetching usage…" : `Usage unavailable: ${error ?? "no data"}`;
						const color = loading ? "dim" : "error";
						return [truncateToWidth(theme.fg(color, message), width, "")];
					},
					invalidate() {},
					dispose() {
						if (activeTui === tui) activeTui = undefined;
					},
				};
			},
			{ placement: "belowEditor" },
		);
	};

	const refresh = async (ctx: ExtensionContext, notifyOnError = false) => {
		if (!visible) return;

		activeRequest?.abort();
		const controller = new AbortController();
		activeRequest = controller;
		const generation = ++requestGeneration;
		const timeout = setTimeout(() => controller.abort(), 5_000);
		loading = true;
		error = undefined;
		requestRender();

		try {
			const response = await fetch(ENDPOINT, { signal: controller.signal });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const nextRows = parseRows(await response.json());
			if (generation !== requestGeneration) return;
			rows = nextRows;
		} catch (cause) {
			if (generation !== requestGeneration) return;
			error = controller.signal.aborted ? "request timed out" : cause instanceof Error ? cause.message : String(cause);
			if (notifyOnError && ctx.hasUI) ctx.ui.notify(`Usage refresh failed: ${error}`, "error");
		} finally {
			clearTimeout(timeout);
			if (generation === requestGeneration) {
				loading = false;
				activeRequest = undefined;
				requestRender();
			}
		}
	};

	const setVisible = async (ctx: ExtensionContext, nextVisible: boolean) => {
		visible = nextVisible;
		installWidget(ctx);
		if (visible) await refresh(ctx, true);
		else activeRequest?.abort();
		ctx.ui.notify(`Usage widget ${visible ? "shown" : "hidden"}`, "info");
	};

	pi.registerCommand("usage", {
		description: "Toggle local usage widget; options: on, off, refresh",
		handler: async (args, ctx) => {
			switch (args.trim().toLowerCase()) {
				case "on":
					await setVisible(ctx, true);
					break;
				case "off":
					await setVisible(ctx, false);
					break;
				case "refresh":
					if (!visible) {
						visible = true;
						installWidget(ctx);
					}
					await refresh(ctx, true);
					break;
				default:
					await setVisible(ctx, !visible);
			}
		},
	});

	pi.registerShortcut("super+shift+u", {
		description: "Toggle local usage widget",
		handler: async ctx => setVisible(ctx, !visible),
	});

	pi.on("session_start", async (_event, ctx) => {
		installWidget(ctx);
		if (visible) await refresh(ctx);
	});

	pi.on("agent_settled", async (_event, ctx) => {
		await refresh(ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		requestGeneration++;
		activeRequest?.abort();
		activeRequest = undefined;
		activeTui = undefined;
		ctx.ui.setWidget(WIDGET_ID, undefined);
	});
}
