import {
	agentNetworkSettingsDelete,
	agentNetworkSettingsGet,
	agentNetworkSettingsPost,
	agentNetworkSettingsPut,
} from "@yorganci/netbird-api/agent_network";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFoundOrUnavailable } from "../errors.ts";

/** NetBird's retention when a settings row omits it. */
const DEFAULT_ACCESS_LOG_RETENTION_DAYS = 30;

export interface AgentGatewayProps {
	/**
	 * Proxy cluster to allocate a labeled endpoint beneath. NetBird picks the
	 * label, so the endpoint reads `<adjective>-<noun>.<proxyAddress>`.
	 * Exactly one of `proxyAddress` and `endpoint` is required.
	 *
	 * Fixed once the gateway is bootstrapped: NetBird never renames an
	 * endpoint, so a different value fails the deploy instead of replacing
	 * the endpoint every agent is configured with.
	 *
	 * @example "proxy.example.com"
	 */
	proxyAddress?: string;
	/**
	 * Hostname to claim verbatim as a dedicated endpoint. Only a proxy whose
	 * cluster address (`NB_PROXY_DOMAIN`) is exactly this hostname serves
	 * it. Exactly one of `proxyAddress` and `endpoint` is required, and, like
	 * `proxyAddress`, it is fixed once bootstrapped.
	 *
	 * @example "agents.example.com"
	 */
	endpoint?: string;
	/**
	 * Keep a full access-log row (path, status, duration and, with prompt
	 * collection, the prompt) for each request. Usage and cost are recorded
	 * regardless. Omitted leaves the current value (NetBird's default on
	 * bootstrap: `true`).
	 */
	logCollection?: boolean;
	/**
	 * Master switch for capturing request prompts and response completions
	 * into the access log. Captured content is only stored while
	 * `logCollection` is on. Omitted leaves the current value (NetBird's
	 * default on bootstrap: `false`).
	 */
	promptCollection?: boolean;
	/**
	 * Redact PII from captured prompts. Omitted leaves the current value
	 * (NetBird's default on bootstrap: `false`).
	 */
	redactPii?: boolean;
	/**
	 * Days to keep full access-log rows; `0` or less keeps them forever.
	 * Omitted leaves the current value (NetBird's default on bootstrap: `30`).
	 */
	accessLogRetentionDays?: number;
}

export interface AgentGatewayAttributes {
	/** Hostname agents call, e.g. `brave-otter.proxy.example.com`. */
	endpoint: string;
	/** `https://${endpoint}`; OpenAI-compatible clients append `/v1`. */
	url: string;
	/** Cluster address of the proxies serving the endpoint. */
	proxyAddress: string;
	/** Whether a proxy dedicated to this endpoint serves it (`endpoint === proxyAddress`). */
	dedicated: boolean;
	logCollection: boolean;
	promptCollection: boolean;
	redactPii: boolean;
	accessLogRetentionDays: number;
}

export type AgentGateway = Resource<"NetBird.AgentGateway", AgentGatewayProps, AgentGatewayAttributes>;

/**
 * The account's NetBird Agent Network gateway: the keyless, tunnel-only
 * endpoint that agents send LLM requests to, plus its collection settings.
 *
 * NetBird keeps one per account. The resource bootstraps it on first deploy
 * and adopts it afterwards; the endpoint is immutable, so only the collection
 * settings converge. The endpoint answers once at least one enabled
 * `AgentNetworkProvider` and one enabled `AgentNetworkPolicy` exist.
 *
 * Deleting it releases the endpoint, which NetBird refuses while any
 * provider exists, and a later bootstrap allocates a new one. Stacks
 * normally retain it (`Alchemy.RemovalPolicy.retain()`).
 *
 * @resource
 * @product Agent Network
 * @category NetBird
 * @section Bootstrapping the Gateway
 * @example Labeled endpoint under the account's proxy cluster
 * ```typescript
 * const gateway = yield* NetBird.AgentGateway("AgentGateway", {
 *   proxyAddress: "proxy.example.com",
 *   promptCollection: true,
 * });
 * // gateway.url → "https://brave-otter.proxy.example.com"
 * ```
 */
export const AgentGateway = Resource<AgentGateway>("NetBird.AgentGateway");

export const isAgentGateway = (value: unknown): value is AgentGateway =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.AgentGateway";

type ApiSettings = {
	endpoint: string;
	proxy_address: string;
	dedicated: boolean;
	enable_log_collection: boolean;
	enable_prompt_collection: boolean;
	redact_pii: boolean;
	access_log_retention_days?: number;
};

export const AgentGatewayProvider = () =>
	Provider.succeed(AgentGateway, {
		stables: ["endpoint", "url", "proxyAddress", "dedicated"],
		// One settings row per account: deleting it only releases the endpoint,
		// so account-wide teardown leaves it alone.
		nuke: { singleton: true },
		read: Effect.fn(function* () {
			const observed = yield* readSettings;
			return observed ? toAttributes(observed) : undefined;
		}),
		list: Effect.fn(function* () {
			const observed = yield* readSettings;
			return observed ? [toAttributes(observed)] : [];
		}),
		reconcile: Effect.fn(function* ({ news }) {
			const props = news ?? ({} as AgentGatewayProps);
			const identity = yield* resolveIdentity(props);

			let observed = yield* readSettings;
			if (!observed) {
				observed = yield* agentNetworkSettingsPost({
					...(identity.kind === "labeled" ? { proxy_address: identity.host } : { endpoint: identity.host }),
					...(props.logCollection !== undefined ? { enable_log_collection: props.logCollection } : {}),
					...(props.promptCollection !== undefined ? { enable_prompt_collection: props.promptCollection } : {}),
					...(props.redactPii !== undefined ? { redact_pii: props.redactPii } : {}),
					...(props.accessLogRetentionDays !== undefined
						? { access_log_retention_days: props.accessLogRetentionDays }
						: {}),
				}).pipe(
					// A concurrent bootstrap wins with 409; carry on with the row it made.
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* readSettings;
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
			}

			yield* assertIdentity(identity, observed);

			const desired = {
				enable_log_collection: props.logCollection ?? observed.enable_log_collection,
				enable_prompt_collection: props.promptCollection ?? observed.enable_prompt_collection,
				redact_pii: props.redactPii ?? observed.redact_pii,
				access_log_retention_days: props.accessLogRetentionDays ?? retentionDays(observed),
			};
			if (
				desired.enable_log_collection !== observed.enable_log_collection ||
				desired.enable_prompt_collection !== observed.enable_prompt_collection ||
				desired.redact_pii !== observed.redact_pii ||
				desired.access_log_retention_days !== retentionDays(observed)
			) {
				// PUT echoes the assigned identity; NetBird rejects any other value.
				const updated = yield* agentNetworkSettingsPut({
					endpoint: observed.endpoint,
					proxy_address: observed.proxy_address,
					...desired,
				});
				return toAttributes(updated);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* () {
			// NetBird answers 412 while providers exist, which surfaces as is: they
			// route through this endpoint and have to go first.
			yield* catchNotFoundOrUnavailable(agentNetworkSettingsDelete({}));
		}),
	});

type Identity = { kind: "labeled" | "dedicated"; host: string };

const normalizeHostname = (host: string) => host.trim().toLowerCase().replace(/\.$/, "");

const resolveIdentity = (props: AgentGatewayProps) =>
	Effect.gen(function* () {
		const proxyAddress = props.proxyAddress?.trim() ? normalizeHostname(props.proxyAddress) : undefined;
		const endpoint = props.endpoint?.trim() ? normalizeHostname(props.endpoint) : undefined;
		if ((proxyAddress === undefined) === (endpoint === undefined)) {
			return yield* Effect.die(
				new Error('NetBird.AgentGateway requires exactly one of "proxyAddress" (labeled) and "endpoint" (dedicated)'),
			);
		}
		return (
			proxyAddress !== undefined ? { kind: "labeled", host: proxyAddress } : { kind: "dedicated", host: endpoint! }
		) satisfies Identity;
	});

/**
 * The endpoint is allocated once and never renamed, so a mismatch is a
 * configuration error rather than something to converge: replacing it would
 * strand every agent configured with the old hostname.
 */
const assertIdentity = (identity: Identity, observed: ApiSettings) => {
	const matches =
		identity.kind === "labeled"
			? !observed.dedicated && normalizeHostname(observed.proxy_address) === identity.host
			: normalizeHostname(observed.endpoint) === identity.host;
	if (matches) return Effect.void;
	const wanted =
		identity.kind === "labeled" ? `a labeled endpoint under "${identity.host}"` : `the endpoint "${identity.host}"`;
	return Effect.die(
		new Error(
			`NetBird.AgentGateway: the account's gateway is already bootstrapped as "${observed.endpoint}" ` +
				`(proxy address "${observed.proxy_address}"), not ${wanted}. The endpoint is immutable: delete every ` +
				"Agent Network provider, then DELETE /api/agent-network/settings, then deploy again.",
		),
	);
};

/** Before bootstrap NetBird reports defaults with an empty endpoint. */
const readSettings = agentNetworkSettingsGet({}).pipe(
	Effect.map((settings): ApiSettings | undefined => (settings.endpoint === "" ? undefined : settings)),
);

const retentionDays = (settings: ApiSettings) =>
	settings.access_log_retention_days ?? DEFAULT_ACCESS_LOG_RETENTION_DAYS;

const toAttributes = (settings: ApiSettings): AgentGatewayAttributes => ({
	endpoint: settings.endpoint,
	url: `https://${settings.endpoint}`,
	proxyAddress: settings.proxy_address,
	dedicated: settings.dedicated,
	logCollection: settings.enable_log_collection,
	promptCollection: settings.enable_prompt_collection,
	redactPii: settings.redact_pii,
	accessLogRetentionDays: retentionDays(settings),
});
