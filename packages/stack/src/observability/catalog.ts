import type { ModelCost } from "../agent-network.ts";
/**
 * What the telemetry dataset is queried with, as plain data: virtual fields,
 * saved views, monitors and dashboards. `index.ts` turns it into Axiom
 * resources; `scripts/check-axiom-queries.ts` runs every query against the
 * live dataset, since Axiom rejects a query that names a field the dataset has
 * not seen.
 *
 * Field paths are the ones Axiom gives OTLP data in an `axiom:events:v1`
 * dataset, read off a probe of records shaped like the gateway's own:
 *
 * - A log record's attributes are each a top-level `attributes.<key>` field.
 * - A span's attributes are `attributes.<key>` when Axiom knows the semantic
 *   convention (`http.*`, `url.*`, `gen_ai.request.model`, the input and output
 *   token counts) and keys of the `attributes.custom` map otherwise.
 * - `service.name`, `trace_id`, `span_id`, `name`, `kind`, `duration`, `body`,
 *   `severity_number` and Axiom's normalised `severity` (`info`, `warn`,
 *   `error`) are top-level. Only a span has a `duration`.
 *
 * Queries use the virtual fields by name, so a path that moves is fixed in one
 * place.
 */
import type * as Axiom from "alchemy/Axiom";

export type Chart = Axiom.DashboardProps["dashboard"]["charts"][number];
export type Dashboard = Axiom.DashboardProps["dashboard"];
type Cell = Omit<Dashboard["layout"][number], "i">;

/** A model the gateway serves, priced from `.#agentGateway.models`. */
export interface PricedModel {
	readonly id: string;
	readonly cost: ModelCost | null;
}

/** The service whose dashboards and monitors these are (`OTEL_SERVICE_NAME`). */
export const SERVICE = "agent-gateway";

/** The `User-Agent` of the collector's probe of `/v1/models` (`otel-collector.nix`). */
export const PROBE_USER_AGENT = "otelcol-httpcheck";

// ---------------------------------------------------------------------------
// Virtual fields
// ---------------------------------------------------------------------------

export interface VirtualField {
	readonly name: string;
	readonly description: string;
	readonly expression: string;
}

const attr = (key: string) => `['attributes.${key}']`;
const custom = (key: string) => `['attributes.custom']['${key}']`;

/** Raw expressions, which the cost field composes: it does not depend on one virtual field reading another. */
const raw = {
	model: `tostring(${attr("gen_ai.request.model")})`,
	input: `toreal(${attr("gen_ai.usage.input_tokens")})`,
	output: `toreal(${attr("gen_ai.usage.output_tokens")})`,
	cacheRead: `coalesce(toreal(${attr("gen_ai.usage.cache_read_input_tokens")}), 0.0)`,
	cacheWrite: `coalesce(toreal(${attr("gen_ai.usage.cache_creation_input_tokens")}), 0.0)`,
};

type Rates = Pick<ModelCost, "input" | "output" | "cacheRead" | "cacheWrite">;

/** USD for one request at `rates` (USD per million tokens); a missing cache rate is the input rate. */
const priced = (rates: Rates) =>
	`((${raw.input} - ${raw.cacheRead} - ${raw.cacheWrite}) * ${rates.input} + ${raw.cacheRead} * ${rates.cacheRead ?? rates.input}` +
	` + ${raw.cacheWrite} * ${rates.cacheWrite ?? rates.input} + ${raw.output} * ${rates.output}) / 1000000`;

/**
 * List-price USD of a finished request, by model. A tier takes over above its
 * prompt size; tiers ascend, so folding left nests the highest one outermost.
 * The `priority` tier's multiplier is not applied: the service tier is on the
 * span, not the log line.
 */
export const estimatedCost = (models: ReadonlyArray<PricedModel>): string => {
	const cases = models.flatMap(({ id, cost }) =>
		cost === null
			? []
			: [
					`${raw.model} == "${id}"`,
					cost.tiers.reduce(
						(below, tier) => `iff(${raw.input} > ${tier.inputTokensAbove}, ${priced(tier)}, ${below})`,
						priced(cost),
					),
				],
	);
	return cases.length === 0 ? "real(null)" : `case(${cases.join(", ")}, real(null))`;
};

export const virtualFields = (models: ReadonlyArray<PricedModel>): ReadonlyArray<VirtualField> => [
	{
		name: "service",
		description: "The emitting service: OTEL_SERVICE_NAME, or the systemd unit for a journald record.",
		expression: "tostring(['service.name'])",
	},
	{
		name: "source",
		description: "`journald` for a record the collector read from the journal, `app` otherwise.",
		expression: `coalesce(tostring(${attr("log.source")}), "app")`,
	},
	{
		name: "probe",
		description: "A request from the collector's probe of /v1/models.",
		expression: `tostring(${attr("user_agent.original")}) startswith "${PROBE_USER_AGENT}"`,
	},
	{
		name: "client",
		description: "The calling program: the product token of the User-Agent (`pi`, `hermes`, `curl`).",
		expression: `extract("^([A-Za-z0-9._-]+)", 1, tostring(${attr("user_agent.original")}))`,
	},
	{
		name: "route",
		description: "The request path of a server span.",
		expression: `tostring(${attr("url.path")})`,
	},
	{
		name: "status_class",
		description: "A server span's response status as `2xx`, `4xx`, `5xx`.",
		expression: `iff(kind == "server", strcat(tostring(toint(toint(${attr("http.response.status_code")}) / 100)), "xx"), "")`,
	},
	{
		name: "duration_ms",
		description: "A span's duration in milliseconds.",
		expression: "toreal(duration / 1ms)",
	},
	{
		name: "streamed",
		description: "Whether a gateway.chat span's request asked for a stream.",
		expression: `tobool(${custom("gen_ai.request.stream")})`,
	},
	{
		name: "processor",
		description: "The request processor a gateway.processor span ran.",
		expression: `tostring(${custom("gateway.processor.name")})`,
	},
	{
		name: "masked_secrets",
		description: "Secrets the mask-secrets processor replaced in a request.",
		expression: `toint(${custom("gateway.mask.secrets")})`,
	},
	{ name: "model", description: "The model asked for, provider prefix included.", expression: raw.model },
	{
		name: "provider",
		description: "The provider that served the request.",
		expression: `tostring(${attr("gen_ai.provider.name")})`,
	},
	{
		name: "account",
		description: "The provider account that served the request.",
		expression: `tostring(${attr("upstream.account")})`,
	},
	{
		name: "termination",
		description: "Why a stream ended: finish, truncated, upstream-error, defect, encode-error.",
		expression: `tostring(${attr("stream.termination")})`,
	},
	{
		name: "ttfb_ms",
		description: "Milliseconds until the provider answered (upstream.ttfb_ms).",
		expression: `toreal(${attr("upstream.ttfb_ms")})`,
	},
	{
		name: "elapsed_ms",
		description: "Milliseconds a response took: the stream's, else the upstream attempt's.",
		expression: `coalesce(toreal(${attr("stream.elapsed_ms")}), toreal(${attr("upstream.elapsed_ms")}))`,
	},
	{ name: "in_tok", description: "Prompt tokens, cached ones included.", expression: raw.input },
	{ name: "out_tok", description: "Output tokens, reasoning included.", expression: raw.output },
	{ name: "cache_read_tok", description: "Prompt tokens read from the cache.", expression: raw.cacheRead },
	{ name: "cache_write_tok", description: "Prompt tokens written to the cache.", expression: raw.cacheWrite },
	{
		name: "uncached_tok",
		description: "Prompt tokens neither read from nor written to the cache.",
		expression: `${raw.input} - ${raw.cacheRead} - ${raw.cacheWrite}`,
	},
	{
		name: "est_cost_usd",
		description: "List-price USD of a finished request, from the prices in .#agentGateway.models.",
		expression: estimatedCost(models),
	},
	{
		name: "error_name",
		description: "The root cause's error name (error.cause.name).",
		expression: `tostring(${attr("error.cause.name")})`,
	},
	{
		name: "error_message",
		description: "What the client was told, else the root cause's message.",
		expression: `coalesce(tostring(${attr("error.message")}), tostring(${attr("error.cause.message")}))`,
	},
	{
		name: "request_id",
		description: "The provider's request id, for its support.",
		expression: `tostring(${attr("upstream.request_id")})`,
	},
	{
		name: "decision",
		description: "What became of a rejected upstream attempt: retry:transport, failover:*, returned.",
		expression: `tostring(${attr("upstream.decision")})`,
	},
	{
		name: "cooldown_scope",
		description: "What a cool-down parked: account, model, model:fast.",
		expression: `tostring(${attr("upstream.cooldown.scope")})`,
	},
	{
		name: "cooldown_reason",
		description: "Why an account was parked or an attempt rejected.",
		expression: `tostring(${attr("upstream.reason")})`,
	},
	{
		name: "cooldown_until",
		description: "When a cool-down ends.",
		expression: `tostring(${attr("upstream.cooldown.until")})`,
	},
];

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Every dashboard filter, declared by every chart so each can honour the ones it has a field for. */
const PARAMETERS =
	'declare query_parameters (model_filter:string = "", provider_filter:string = "", account_filter:string = "",\n' +
	'                          client_filter:string = "", q:string = "");';

const lines = (...parts: ReadonlyArray<string>) => parts.join("\n");

/** The gateway's own log records, narrowed by the filter bar. */
const logs = (dataset: string, ...body: ReadonlyArray<string>) =>
	lines(
		PARAMETERS,
		`['${dataset}']`,
		`| where service == "${SERVICE}" and isnull(duration) and source == "app"`,
		"| where isempty(model_filter) or model == model_filter",
		"| where isempty(provider_filter) or provider == provider_filter",
		"| where isempty(account_filter) or account == account_filter",
		"| where isempty(q) or body contains q",
		...body,
	);

/** The gateway's spans, narrowed by the client filter. */
const spans = (dataset: string, ...body: ReadonlyArray<string>) =>
	lines(
		PARAMETERS,
		`['${dataset}']`,
		`| where service == "${SERVICE}" and isnotnull(duration)`,
		"| where isempty(client_filter) or client == client_filter",
		...body,
	);

/** Requests clients made: server spans, the collector's probe left out. */
const requests = (dataset: string, ...body: ReadonlyArray<string>) =>
	spans(dataset, '| where kind == "server" and not(probe)', ...body);

const FINISHED = '("chat completion stream finished", "chat completion finished")';
const FAILED = '"chat completion stream failed"';

// ---------------------------------------------------------------------------
// Monitors
// ---------------------------------------------------------------------------

export interface Monitor {
	readonly key: string;
	readonly props: Omit<Axiom.MonitorProps, "notifierIds">;
}

/**
 * Three monitors, the Personal plan's limit, each covering several failures:
 * the gateway gone, the gateway broken, the gateway failing requests.
 */
export const monitors = (dataset: string): ReadonlyArray<Monitor> => [
	{
		key: "GatewayDown",
		props: {
			name: "Agent gateway unreachable",
			description:
				"The collector on mars probes /v1/models every minute. No successful probe in 10 minutes means the gateway, the collector or mars is down.",
			type: "Threshold",
			aplQuery: lines(
				`['${dataset}']`,
				`| where service == "${SERVICE}" and kind == "server" and probe and status_class == "2xx"`,
				"| summarize probes = count()",
			),
			operator: "Below",
			threshold: 1,
			intervalMinutes: 5,
			rangeMinutes: 10,
			alertOnNoData: true,
		},
	},
	{
		key: "GatewayBroken",
		props: {
			name: "Agent gateway crashed or hit a bug",
			description:
				"One email per event: the unit failed (systemd), a stream ended in a defect or an encoding error (always a gateway bug), a fatal log line, or the collector failing to export.",
			type: "MatchEvent",
			aplQuery: lines(
				`['${dataset}']`,
				`| where (service == "${SERVICE}" and source == "journald" and body contains "Failed with result")`,
				`    or (service == "${SERVICE}" and termination in ("defect", "encode-error"))`,
				`    or (service == "${SERVICE}" and body == "chat completion stream ended without a recorded outcome")`,
				`    or (service == "${SERVICE}" and severity_number >= 21)`,
				'    or (service == "opentelemetry-collector" and body contains "Exporting failed")',
				"| project _time, service, severity, body, termination, error_message, trace_id",
			),
			intervalMinutes: 1,
			rangeMinutes: 1,
		},
	},
	{
		key: "GatewayFailing",
		props: {
			name: "Agent gateway failing requests",
			description:
				"More than 5 failed requests in 15 minutes, twice running: gateway 5xx responses and streams that ended in an upstream error or truncated.",
			type: "Threshold",
			aplQuery: lines(
				`['${dataset}']`,
				`| where service == "${SERVICE}"`,
				'| where (kind == "server" and not(probe) and status_class == "5xx") or termination in ("upstream-error", "truncated")',
				"| summarize failures = count()",
			),
			operator: "Above",
			threshold: 5,
			intervalMinutes: 5,
			rangeMinutes: 15,
			triggerFromNRuns: 2,
		},
	},
];

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export interface View {
	readonly key: string;
	readonly name: string;
	readonly description: string;
	readonly aplQuery: string;
}

export const views = (dataset: string): ReadonlyArray<View> => [
	{
		key: "FailedStreams",
		name: "gateway-failed-streams",
		description: "Every failed stream with its full context, newest first.",
		aplQuery: lines(
			`['${dataset}']`,
			`| where service == "${SERVICE}" and body startswith ${FAILED}`,
			"| order by _time desc",
		),
	},
	{
		key: "TraceLogs",
		name: "gateway-trace-logs",
		description: "Each gateway.chat span with the log lines written under its trace.",
		aplQuery: lines(
			`['${dataset}']`,
			`| where service == "${SERVICE}" and name == "gateway.chat"`,
			"| project _time, trace_id, model, span_ms = duration_ms",
			"| join kind=leftouter (",
			`    ['${dataset}']`,
			`    | where service == "${SERVICE}" and isnull(duration) and isnotempty(trace_id)`,
			"    | project trace_id, logged = _time, severity, body, termination, account",
			"  ) on trace_id",
			// After a join, Axiom sorts by `_time` alone.
			"| order by _time desc",
		),
	},
	{
		key: "SlowStreams",
		name: "gateway-slow-streams",
		description: "Finished streams whose provider took over 8 s to answer or that ran over 2 minutes.",
		aplQuery: lines(
			`['${dataset}']`,
			`| where service == "${SERVICE}" and body == "chat completion stream finished"`,
			"| where ttfb_ms > 8000 or elapsed_ms > 120000",
			"| project _time, model, provider, account, ttfb_ms, elapsed_ms, out_tok, trace_id",
			"| order by _time desc",
		),
	},
	{
		key: "Cooldowns",
		name: "gateway-cooldowns",
		description: "Every account cool-down: what was parked, why and until when.",
		aplQuery: lines(
			`['${dataset}']`,
			`| where service == "${SERVICE}" and body == "upstream account cooling down"`,
			"| project _time, provider, account, model, cooldown_scope, cooldown_reason, cooldown_until",
			"| order by _time desc",
		),
	},
	{
		key: "Lifecycle",
		name: "gateway-lifecycle",
		description: "What only the journal has: starts, crashes, restarts, the health check, the collector's own errors.",
		aplQuery: lines(
			`['${dataset}']`,
			'| where source == "journald"',
			"| project _time, service, severity, body",
			"| order by _time desc",
		),
	},
];

// ---------------------------------------------------------------------------
// Dashboard elements
// ---------------------------------------------------------------------------

/** One dashboard element: its chart and where it sits on the 12-column grid. */
export interface Element {
	readonly chart: Chart;
	readonly cell: Cell;
}

const at = (x: number, y: number, w: number, h: number): Cell => ({ x, y, w, h });

const section = (id: string, title: string, text: string, y: number): Element => ({
	chart: { id, type: "Note", text: `**${title}**: ${text}` },
	cell: at(0, y, 12, 1),
});

const selectFromLogs = (dataset: string, field: string, scope = "") =>
	lines(
		...(scope === "" ? [] : ['declare query_parameters (provider_filter:string = "");']),
		`['${dataset}']`,
		`| where service == "${SERVICE}" and isnotempty(${field})${scope}`,
		`| distinct ${field}`,
		`| project key = ${field}, value = ${field}`,
		"| sort by key asc",
	);

const ALL = [{ key: "All", value: "", default: true }];

const filters = (dataset: string): Chart => ({
	id: "filters",
	type: "SmartFilter",
	name: "Filters",
	filters: [
		{
			id: "model_filter",
			name: "Model",
			type: "select",
			selectType: "query",
			options: ALL,
			query: { apl: selectFromLogs(dataset, "model") },
		},
		{
			id: "provider_filter",
			name: "Provider",
			type: "select",
			selectType: "query",
			options: ALL,
			query: { apl: selectFromLogs(dataset, "provider") },
		},
		{
			id: "account_filter",
			name: "Account",
			type: "select",
			selectType: "query",
			options: ALL,
			query: {
				apl: selectFromLogs(dataset, "account", " and (isempty(provider_filter) or provider == provider_filter)"),
			},
		},
		{
			id: "client_filter",
			name: "Client",
			type: "select",
			selectType: "query",
			options: ALL,
			query: {
				apl: lines(
					`['${dataset}']`,
					`| where service == "${SERVICE}" and kind == "server" and not(probe) and isnotempty(client)`,
					"| distinct client",
					"| project key = client, value = client",
					"| sort by key asc",
				),
			},
		},
		{ id: "q", name: "Search log messages", type: "search" },
	],
});

/** Every element either dashboard uses, by id. */
const elements = (dataset: string, monitorIds: ReadonlyArray<string>) => {
	const L = (...body: ReadonlyArray<string>) => ({ apl: logs(dataset, ...body) });
	const S = (...body: ReadonlyArray<string>) => ({ apl: spans(dataset, ...body) });
	const R = (...body: ReadonlyArray<string>) => ({ apl: requests(dataset, ...body) });

	const charts = {
		filters: filters(dataset),

		// Health -----------------------------------------------------------------
		statProbe: {
			id: "stat-probe",
			type: "Statistic",
			name: "Probes OK, last 10 min",
			query: {
				apl: lines(
					`['${dataset}']`,
					`| where service == "${SERVICE}" and kind == "server" and probe and status_class == "2xx"`,
					"| where _time > ago(10m)",
					"| summarize count()",
				),
			},
			colorScheme: "Green",
			warningThreshold: "Below",
			warningThresholdValue: "8",
			errorThreshold: "Below",
			errorThresholdValue: "1",
		},
		statRequests: {
			id: "stat-requests",
			type: "Statistic",
			name: "Requests",
			query: R("| summarize count() by bin_auto(_time)"),
			colorScheme: "Blue",
			showChart: true,
		},
		stat5xx: {
			id: "stat-5xx",
			type: "Statistic",
			name: "5xx rate",
			query: R('| summarize round(100.0 * countif(status_class == "5xx") / count(), 2)'),
			customUnits: "%",
			warningThreshold: "Above",
			warningThresholdValue: "0.5",
			errorThreshold: "Above",
			errorThresholdValue: "2",
		},
		statStreamSuccess: {
			id: "stat-stream-success",
			type: "Statistic",
			name: "Streams OK",
			query: L(
				"| where isnotempty(termination)",
				'| summarize round(100.0 * countif(termination == "finish") / count(), 1)',
			),
			customUnits: "%",
			warningThreshold: "Below",
			warningThresholdValue: "99",
			errorThreshold: "Below",
			errorThresholdValue: "95",
		},
		statTtfb: {
			id: "stat-ttfb",
			type: "Statistic",
			name: "TTFB p95",
			query: L(`| where body in ${FINISHED} and isnotnull(ttfb_ms)`, "| summarize percentile(ttfb_ms, 95)"),
			customUnits: "ms",
			warningThreshold: "Above",
			warningThresholdValue: "3000",
			errorThreshold: "Above",
			errorThresholdValue: "8000",
		},
		statSpend: {
			id: "stat-spend",
			type: "Statistic",
			name: "Spend (list price)",
			query: L("| where isnotnull(est_cost_usd)", "| summarize round(sum(est_cost_usd), 2) by bin_auto(_time)"),
			customUnits: "USD",
			colorScheme: "Purple",
			showChart: true,
		},
		tsRequests: {
			id: "ts-requests",
			type: "TimeSeries",
			name: "Requests by status class",
			query: {
				...R("| summarize count() by bin_auto(_time), status_class"),
				queryOptions: { timeSeriesVariant: "bars", displayNull: "zero" },
			},
		},
		monitors: {
			id: "monitors",
			type: "MonitorList",
			name: "Monitors",
			selectedMonitors: [...monitorIds],
			columns: { status: true, history: true, dataset: false, type: true, notifiers: true },
		},

		// Latency ----------------------------------------------------------------
		tsFirstEvent: {
			id: "ts-first-event",
			type: "TimeSeries",
			name: "Time to first event, streamed (p50 / p95 / p99)",
			query: {
				...S(
					'| where name == "gateway.chat" and streamed',
					"| where isempty(model_filter) or model == model_filter",
					"| summarize p50 = percentile(duration_ms, 50), p95 = percentile(duration_ms, 95),",
					"            p99 = percentile(duration_ms, 99) by bin_auto(_time)",
				),
				queryOptions: { timeSeriesVariant: "line" },
			},
		},
		heatFirstEvent: {
			id: "heat-first-event",
			type: "Heatmap",
			name: "Time to first event, distribution (ms)",
			query: S(
				'| where name == "gateway.chat" and streamed',
				"| where isempty(model_filter) or model == model_filter",
				"| summarize histogram(duration_ms, 20) by bin_auto(_time)",
			),
		},
		tsTtfb: {
			id: "ts-ttfb",
			type: "TimeSeries",
			name: "Provider TTFB by provider (p50 / p95)",
			query: {
				...L(
					`| where body in ${FINISHED} and isnotnull(ttfb_ms)`,
					"| summarize p50 = percentile(ttfb_ms, 50), p95 = percentile(ttfb_ms, 95) by bin_auto(_time), provider",
				),
				queryOptions: { timeSeriesVariant: "line" },
			},
		},
		tsStreamDuration: {
			id: "ts-stream-duration",
			type: "TimeSeries",
			name: "Stream duration by provider (p50 / p95)",
			query: {
				...L(
					'| where body == "chat completion stream finished"',
					"| summarize p50 = percentile(elapsed_ms, 50), p95 = percentile(elapsed_ms, 95) by bin_auto(_time), provider",
				),
				queryOptions: { timeSeriesVariant: "line" },
			},
		},

		// Streams & errors -------------------------------------------------------
		tsTerminations: {
			id: "ts-terminations",
			type: "TimeSeries",
			name: "Stream endings by reason",
			query: {
				...L("| where isnotempty(termination)", "| summarize count() by bin_auto(_time), termination"),
				queryOptions: { timeSeriesVariant: "bars", displayNull: "zero" },
			},
		},
		pieTerminations: {
			id: "pie-terminations",
			type: "Pie",
			name: "Stream endings",
			query: L("| where isnotempty(termination)", "| summarize count() by termination"),
		},
		topErrors: {
			id: "topk-errors",
			type: "TopK",
			name: "Top failure causes",
			query: L(
				'| where severity in ("warn", "error") and isnotempty(error_name)',
				"| summarize count() by error_name",
				"| top 8 by count_ desc",
			),
		},
		tableFailures: {
			id: "table-failures",
			type: "Table",
			name: "Recent failed streams",
			query: L(
				`| where body startswith ${FAILED}`,
				"| project _time, model, provider, account, termination, error_name, error_message, elapsed_ms, request_id, trace_id",
				"| order by _time desc",
				"| take 50",
			),
			tableSettings: { settings: { fitColumns: true, hideNulls: true } },
		},

		// Usage & cost -----------------------------------------------------------
		tsTokens: {
			id: "ts-tokens",
			type: "TimeSeries",
			name: "Tokens by kind",
			query: {
				...L(
					"| where isnotnull(in_tok)",
					"| summarize uncached = sum(uncached_tok), cache_read = sum(cache_read_tok),",
					"            cache_write = sum(cache_write_tok), output = sum(out_tok) by bin_auto(_time)",
				),
				queryOptions: { timeSeriesVariant: "area" },
			},
		},
		tsSpend: {
			id: "ts-spend",
			type: "TimeSeries",
			name: "Spend by model (list price, USD)",
			query: {
				...L("| where isnotnull(est_cost_usd)", "| summarize spend = sum(est_cost_usd) by bin_auto(_time), model"),
				queryOptions: { timeSeriesVariant: "bars", displayNull: "zero" },
			},
		},
		tableModels: {
			id: "table-models",
			type: "Table",
			name: "Models",
			query: L(
				`| where body in ${FINISHED} or body startswith ${FAILED}`,
				'| summarize requests = count(), failed = countif(severity == "error"), ttfb_p95_ms = percentile(ttfb_ms, 95),',
				"            input = sum(in_tok), output = sum(out_tok), cache_read = sum(cache_read_tok),",
				"            spend_usd = round(sum(est_cost_usd), 2) by model, provider",
				"| extend success_pct = round(100.0 * (requests - failed) / requests, 1),",
				"         cache_hit_pct = round(100.0 * cache_read / input, 1)",
				"| project model, provider, requests, success_pct, ttfb_p95_ms, input, output, cache_hit_pct, spend_usd",
				"| order by spend_usd desc",
			),
		},
		pieSpend: {
			id: "pie-spend",
			type: "Pie",
			name: "Spend by provider (list price, USD)",
			query: L("| where isnotnull(est_cost_usd)", "| summarize spend = sum(est_cost_usd) by provider"),
		},
		tableClients: {
			id: "table-clients",
			type: "Table",
			name: "Clients and routes",
			query: R(
				'| summarize requests = count(), errors_5xx = countif(status_class == "5xx"),',
				"            p95_ms = percentile(duration_ms, 95) by client, route",
				"| order by requests desc",
				"| take 20",
			),
		},
		scatterThroughput: {
			id: "scatter-throughput",
			type: "Scatter",
			name: "Output tokens vs stream time, by model (averages)",
			query: L(
				'| where body == "chat completion stream finished"',
				"| summarize avg(out_tok), avg(elapsed_ms) by model",
			),
		},

		// Upstreams & accounts ---------------------------------------------------
		tsAttempts: {
			id: "ts-attempts",
			type: "TimeSeries",
			name: "Upstream retries and failovers",
			query: {
				...L('| where body == "upstream attempt rejected"', "| summarize count() by bin_auto(_time), decision"),
				queryOptions: { timeSeriesVariant: "bars", displayNull: "zero" },
			},
		},
		tableAccounts: {
			id: "table-accounts",
			type: "Table",
			name: "Accounts",
			query: L(
				"| where isnotempty(account)",
				`| summarize finished = countif(body in ${FINISHED}), failed = countif(body startswith ${FAILED}),`,
				'            rejected = countif(body == "upstream attempt rejected"),',
				'            cooldowns = countif(body == "upstream account cooling down"),',
				"            spend_usd = round(sum(est_cost_usd), 2), last_seen = max(_time) by provider, account",
				"| order by finished desc",
			),
		},
		tableCooldowns: {
			id: "table-cooldowns",
			type: "Table",
			name: "Recent cool-downs",
			query: L(
				'| where body == "upstream account cooling down"',
				"| project _time, provider, account, model, cooldown_scope, cooldown_reason, cooldown_until",
				"| order by _time desc",
				"| take 50",
			),
		},
		tsProcessors: {
			id: "ts-processors",
			type: "TimeSeries",
			name: "Request processor time (p50 / p95, ms)",
			query: {
				...S(
					'| where name == "gateway.processor"',
					"| summarize p50 = percentile(duration_ms, 50), p95 = percentile(duration_ms, 95) by bin_auto(_time), processor",
				),
				queryOptions: { timeSeriesVariant: "line" },
			},
		},

		// Logs & lifecycle -------------------------------------------------------
		logErrors: {
			id: "logstream-errors",
			type: "LogStream",
			name: "Warnings and errors",
			query: L(
				'| where severity in ("warn", "error")',
				"| project _time, severity, body, model, provider, account, termination, error_message, trace_id",
			),
			tableSettings: { settings: { highlightSeverity: true, showTimestamp: true, wrapLines: true, hideNulls: true } },
		},
		logLifecycle: {
			id: "logstream-lifecycle",
			type: "LogStream",
			name: "Service lifecycle (journald)",
			query: {
				apl: lines(`['${dataset}']`, '| where source == "journald"', "| project _time, severity, service, body"),
			},
			tableSettings: { settings: { highlightSeverity: true, showTimestamp: true, hideNulls: true } },
		},
		statRestarts: {
			id: "stat-restarts",
			type: "Statistic",
			name: "Unplanned restarts",
			query: {
				apl: lines(
					`['${dataset}']`,
					`| where source == "journald" and service == "${SERVICE}" and body contains "Scheduled restart job"`,
					"| summarize count()",
				),
			},
			errorThreshold: "Above",
			errorThresholdValue: "0",
		},
		statMasked: {
			id: "stat-masked",
			type: "Statistic",
			name: "Secrets masked in requests",
			query: S("| where isnotnull(masked_secrets)", "| summarize sum(masked_secrets) by bin_auto(_time)"),
			colorScheme: "Purple",
			showChart: true,
		},
		runbook: {
			id: "note-runbook",
			type: "Note",
			text: [
				"#### Runbook",
				"- **Gateway unreachable or crashed**: `ssh mars journalctl -u agent-gateway -n 200`, then `systemctl status agent-gateway opentelemetry-collector`.",
				"- **Requests failing**: the Recent failed streams table, then the saved view `gateway-failed-streams`; `gateway-trace-logs` joins each request's span to its log lines.",
				"- **Accounts exhausted**: the Recent cool-downs table and `curl https://ai.yorganci.dev/_/usage`.",
				"- **Nothing arriving**: `journalctl -u opentelemetry-collector` on mars. A 401 is a stale token: `just connect-axiom mars`, then redeploy mars.",
				"- Spend is list price from `.#agentGateway.models`, not what the subscriptions cost.",
			].join("\n"),
		},
	} satisfies Record<string, Chart>;
	return charts;
};

const OVERVIEW_DESCRIPTION =
	"The agent gateway on mars: health, latency, streams, usage and spend, upstream accounts, logs. Managed by Alchemy (HomeInfra): changes made here are overwritten on deploy.";

/** The 24-hour operations dashboard. */
export const overview = (dataset: string, monitorIds: ReadonlyArray<string>): Dashboard => {
	const c = elements(dataset, monitorIds);
	const placed: ReadonlyArray<Element> = [
		{ chart: c.filters, cell: at(0, 0, 12, 2) },

		section("sec-health", "Health", "is it up, is it answering, is it failing, and what is it costing.", 2),
		{ chart: c.statProbe, cell: at(0, 3, 2, 3) },
		{ chart: c.statRequests, cell: at(2, 3, 2, 3) },
		{ chart: c.stat5xx, cell: at(4, 3, 2, 3) },
		{ chart: c.statStreamSuccess, cell: at(6, 3, 2, 3) },
		{ chart: c.statTtfb, cell: at(8, 3, 2, 3) },
		{ chart: c.statSpend, cell: at(10, 3, 2, 3) },
		{ chart: c.tsRequests, cell: at(0, 6, 8, 7) },
		{ chart: c.monitors, cell: at(8, 6, 4, 7) },

		section(
			"sec-latency",
			"Latency",
			"the client's wait for a stream's first event, the provider's, and how long answers run.",
			13,
		),
		{ chart: c.tsFirstEvent, cell: at(0, 14, 6, 7) },
		{ chart: c.heatFirstEvent, cell: at(6, 14, 6, 7) },
		{ chart: c.tsTtfb, cell: at(0, 21, 6, 7) },
		{ chart: c.tsStreamDuration, cell: at(6, 21, 6, 7) },

		section("sec-streams", "Streams and errors", "why streams ended, and the failures behind them.", 28),
		{ chart: c.tsTerminations, cell: at(0, 29, 6, 7) },
		{ chart: c.pieTerminations, cell: at(6, 29, 3, 7) },
		{ chart: c.topErrors, cell: at(9, 29, 3, 7) },
		{ chart: c.tableFailures, cell: at(0, 36, 12, 8) },

		section("sec-usage", "Usage and cost", "tokens, prompt-cache efficiency and list-price spend.", 44),
		{ chart: c.tsTokens, cell: at(0, 45, 6, 7) },
		{ chart: c.tsSpend, cell: at(6, 45, 6, 7) },
		{ chart: c.tableModels, cell: at(0, 52, 8, 8) },
		{ chart: c.pieSpend, cell: at(8, 52, 4, 8) },
		{ chart: c.tableClients, cell: at(0, 60, 6, 7) },
		{ chart: c.scatterThroughput, cell: at(6, 60, 6, 7) },

		section(
			"sec-upstreams",
			"Upstreams and accounts",
			"retries, failovers and cool-downs across the credential pool.",
			67,
		),
		{ chart: c.tsAttempts, cell: at(0, 68, 6, 7) },
		{ chart: c.tableAccounts, cell: at(6, 68, 6, 7) },
		{ chart: c.tableCooldowns, cell: at(0, 75, 6, 7) },
		{ chart: c.tsProcessors, cell: at(6, 75, 6, 7) },

		section("sec-logs", "Logs and lifecycle", "the app's warnings and errors, and what only the journal saw.", 82),
		{ chart: c.logErrors, cell: at(0, 83, 12, 9) },
		{ chart: c.logLifecycle, cell: at(0, 92, 8, 7) },
		{ chart: c.statRestarts, cell: at(8, 92, 4, 3) },
		{ chart: c.statMasked, cell: at(8, 95, 4, 4) },
		{ chart: c.runbook, cell: at(0, 99, 12, 4) },
	];
	return document({
		name: "Agent Gateway",
		description: OVERVIEW_DESCRIPTION,
		refreshTime: 60,
		timeWindowStart: "qr-now-24h",
		placed,
	});
};

/** The same usage charts over a week, against the week before. */
export const weekly = (dataset: string, monitorIds: ReadonlyArray<string>): Dashboard => {
	const c = elements(dataset, monitorIds);
	const placed: ReadonlyArray<Element> = [
		{ chart: c.filters, cell: at(0, 0, 12, 2) },
		{ chart: c.statRequests, cell: at(0, 2, 3, 3) },
		{ chart: c.statStreamSuccess, cell: at(3, 2, 3, 3) },
		{ chart: c.statTtfb, cell: at(6, 2, 3, 3) },
		{ chart: c.statSpend, cell: at(9, 2, 3, 3) },
		{ chart: c.tsSpend, cell: at(0, 5, 6, 7) },
		{ chart: c.tsTokens, cell: at(6, 5, 6, 7) },
		{ chart: c.tableModels, cell: at(0, 12, 8, 8) },
		{ chart: c.pieSpend, cell: at(8, 12, 4, 8) },
		{ chart: c.tableAccounts, cell: at(0, 20, 6, 7) },
		{ chart: c.tableClients, cell: at(6, 20, 6, 7) },
	];
	return document({
		name: "Agent Gateway · Weekly",
		description: `Usage, cost and reliability over the last 7 days, against the 7 before. ${OVERVIEW_DESCRIPTION.split(": ")[1]}`,
		refreshTime: 300,
		timeWindowStart: "qr-now-7d",
		against: "-7d",
		placed,
	});
};

const document = (options: {
	readonly name: string;
	readonly description: string;
	readonly refreshTime: Dashboard["refreshTime"];
	readonly timeWindowStart: string;
	readonly against?: Dashboard["against"];
	readonly placed: ReadonlyArray<Element>;
}): Dashboard => ({
	name: options.name,
	// Org-shared. Required when the API token is not a user's.
	owner: "",
	description: options.description,
	charts: options.placed.map(element => element.chart),
	layout: options.placed.map(element => ({ i: element.chart.id, ...element.cell })),
	refreshTime: options.refreshTime,
	schemaVersion: 2,
	timeWindowStart: options.timeWindowStart,
	timeWindowEnd: "qr-now",
	...(options.against === undefined ? {} : { against: options.against }),
});

/** Every query the catalog holds, labelled, for `scripts/check-axiom-queries.ts`. */
export const queries = (dataset: string): ReadonlyArray<{ readonly label: string; readonly apl: string }> => {
	const fromCharts = (dashboard: Dashboard) =>
		dashboard.charts.flatMap(chart => {
			if (chart.type === "SmartFilter" && "filters" in chart) {
				return chart.filters.flatMap(filter =>
					"query" in filter && filter.query !== undefined && "apl" in filter.query
						? [{ label: `filter ${filter.id}`, apl: filter.query.apl }]
						: [],
				);
			}
			return "query" in chart && "apl" in chart.query ? [{ label: `chart ${chart.id}`, apl: chart.query.apl }] : [];
		});
	const seen = new Set<string>();
	return [
		...fromCharts(overview(dataset, [])),
		...fromCharts(weekly(dataset, [])),
		...monitors(dataset).map(monitor => ({ label: `monitor ${monitor.key}`, apl: monitor.props.aplQuery ?? "" })),
		...views(dataset).map(view => ({ label: `view ${view.name}`, apl: view.aplQuery })),
	].filter(query => (seen.has(query.label) ? false : (seen.add(query.label), true)));
};
