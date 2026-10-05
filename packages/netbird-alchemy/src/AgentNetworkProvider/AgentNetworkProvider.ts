import {
	agentNetworkProvidersGet,
	agentNetworkProvidersPost,
	agentNetworkProvidersProviderIdDelete,
	agentNetworkProvidersProviderIdGet,
	agentNetworkProvidersProviderIdPut,
} from "@yorganci/netbird-api/agent_network";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import { catchNotFound, catchNotFoundOrUnavailable } from "../errors.ts";

/**
 * A model the provider serves, with the prices NetBird meters it at (USD per
 * 1k tokens). Which cache rate applies depends on the request's API shape:
 * OpenAI-shaped requests bill cached prompt tokens at `cachedInputPer1k`;
 * Anthropic-shaped ones bill `cacheReadPer1k` and `cacheCreationPer1k`.
 * An omitted cache rate inherits NetBird's default for the model, if any.
 */
export interface AgentNetworkProviderModel {
	/** Model id exactly as clients send it; routing matches it verbatim. */
	id: string;
	inputPer1k: number;
	outputPer1k: number;
	cachedInputPer1k?: number;
	cacheReadPer1k?: number;
	cacheCreationPer1k?: number;
}

export interface AgentNetworkProviderProps {
	/**
	 * Display name. Used as a stable identifier so the provider can locate
	 * the record by name during adoption / state recovery. If omitted, a
	 * unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/**
	 * NetBird catalog entry naming the provider type, e.g. `openai_api`,
	 * `anthropic_api`, `custom`, or a gateway such as `litellm_proxy` or
	 * `agentgateway`. It decides the auth header, the request parser and the
	 * identity headers stamped on upstream requests.
	 */
	catalogId: string;
	/**
	 * Upstream NetBird forwards to, with scheme. The proxy joins this path
	 * with the request path, so OpenAI-compatible gateways take the bare
	 * origin (`http://127.0.0.1:3000`, not `…/v1`). A loopback or private
	 * address is dialled from the proxy's own host and is never
	 * credential-checked by management.
	 */
	upstreamUrl: string;
	/**
	 * Credential NetBird injects upstream (`Authorization: Bearer …` for most
	 * catalog entries). Required by NetBird even when the upstream ignores
	 * it. Never returned by the API; sent again only when it changes.
	 */
	apiKey: Redacted.Redacted<string>;
	/**
	 * Models routed to this provider, with prices. Empty claims every model,
	 * priced from NetBird's built-in table, which knows no prefixed or custom
	 * ids: such requests are metered at $0.
	 *
	 * @default []
	 */
	models?: ReadonlyArray<AgentNetworkProviderModel>;
	/**
	 * Values for catalog-declared extra headers (e.g. `x-portkey-config`).
	 * Omitted leaves the current values.
	 */
	extraValues?: Readonly<Record<string, string>>;
	/** Header carrying the caller's identity, for catalog entries that let it be renamed. Omitted leaves it as is. */
	identityHeaderUserId?: string;
	/** Header carrying the caller's groups, for catalog entries that let it be renamed. Omitted leaves it as is. */
	identityHeaderGroups?: string;
	/** Omitted leaves the current value (NetBird's default on create: `true`). */
	enabled?: boolean;
	/** Skip upstream certificate verification. Omitted leaves the current value (default `false`). */
	skipTlsVerification?: boolean;
	/** Stop stamping the caller's identity onto upstream requests. Omitted leaves the current value (default `false`). */
	metadataDisabled?: boolean;
	/**
	 * Ordering edge only; never sent to NetBird. Pass the
	 * `AgentGateway`'s `endpoint` so a destroy removes providers before the
	 * gateway, which NetBird refuses to delete while any provider exists.
	 */
	gateway?: string;
}

export interface AgentNetworkProviderAttributes {
	/** Provider record id assigned by NetBird; policies reference it. */
	providerId: string;
	name: string;
	catalogId: string;
	upstreamUrl: string;
	models: ReadonlyArray<AgentNetworkProviderModel>;
	enabled: boolean;
	skipTlsVerification: boolean;
	metadataDisabled: boolean;
	identityHeaderUserId: string;
	identityHeaderGroups: string;
}

export type AgentNetworkProvider = Resource<
	"NetBird.AgentNetworkProvider",
	AgentNetworkProviderProps,
	AgentNetworkProviderAttributes
>;

/**
 * An upstream LLM API or gateway the account's Agent Network gateway routes
 * to. NetBird holds the credential and injects it upstream, so callers never
 * see it. Nothing reaches a provider until an `AgentNetworkPolicy` authorises
 * a group for it.
 *
 * @resource
 * @product Agent Network
 * @category NetBird
 * @section Connecting a Provider
 * @example A self-hosted OpenAI-compatible gateway next to the proxy
 * ```typescript
 * const provider = yield* NetBird.AgentNetworkProvider("Gateway", {
 *   name: "agent-gateway",
 *   catalogId: "agentgateway",
 *   upstreamUrl: "http://127.0.0.1:3000",
 *   apiKey: Redacted.make("unused"),
 *   models: [{ id: "gpt-4o-mini", inputPer1k: 0.00015, outputPer1k: 0.0006 }],
 *   gateway: gateway.endpoint,
 * });
 * ```
 */
export const AgentNetworkProvider = Resource<AgentNetworkProvider>("NetBird.AgentNetworkProvider");

export const isAgentNetworkProvider = (value: unknown): value is AgentNetworkProvider =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.AgentNetworkProvider";

type ApiModel = {
	id: string;
	input_per_1k: number;
	output_per_1k: number;
	cached_input_per_1k?: number;
	cache_read_per_1k?: number;
	cache_creation_per_1k?: number;
};

type ApiProvider = {
	id: string;
	provider_id: string;
	name: string;
	upstream_url: string;
	models: ReadonlyArray<ApiModel>;
	extra_values?: Readonly<Record<string, string>>;
	identity_header_user_id: string;
	identity_header_groups: string;
	enabled: boolean;
	skip_tls_verification: boolean;
	metadata_disabled: boolean;
};

export const AgentNetworkProviderProvider = () =>
	Provider.succeed(AgentNetworkProvider, {
		stables: ["providerId"],
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.providerId) {
				const direct = yield* catchNotFound(agentNetworkProvidersProviderIdGet({ providerId: output.providerId }));
				if (direct) return toAttributes(direct);
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findProviderByName(name);
			return existing ? toAttributes(existing) : undefined;
		}),
		list: Effect.fn(function* () {
			const all = yield* agentNetworkProvidersGet({});
			return all.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ id, news, olds, output }) {
			const props = news;
			const name = yield* resolveName(id, props.name);
			const models = (props.models ?? []).map(toApiModel);

			let observed: ApiProvider | undefined;
			if (output?.providerId) {
				observed = yield* catchNotFound(agentNetworkProvidersProviderIdGet({ providerId: output.providerId }));
			}
			if (!observed) {
				observed = yield* findProviderByName(name);
			}

			if (!observed) {
				const created = yield* agentNetworkProvidersPost({
					provider_id: props.catalogId,
					name,
					upstream_url: props.upstreamUrl,
					api_key: props.apiKey,
					models,
					...(props.extraValues !== undefined ? { extra_values: { ...props.extraValues } } : {}),
					...(props.identityHeaderUserId !== undefined ? { identity_header_user_id: props.identityHeaderUserId } : {}),
					...(props.identityHeaderGroups !== undefined ? { identity_header_groups: props.identityHeaderGroups } : {}),
					...(props.enabled !== undefined ? { enabled: props.enabled } : {}),
					...(props.skipTlsVerification !== undefined ? { skip_tls_verification: props.skipTlsVerification } : {}),
					...(props.metadataDisabled !== undefined ? { metadata_disabled: props.metadataDisabled } : {}),
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findProviderByName(name);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created);
			}

			const desired = {
				provider_id: props.catalogId,
				name,
				upstream_url: props.upstreamUrl,
				models,
				extra_values: props.extraValues ?? observed.extra_values ?? {},
				identity_header_user_id: props.identityHeaderUserId ?? observed.identity_header_user_id,
				identity_header_groups: props.identityHeaderGroups ?? observed.identity_header_groups,
				enabled: props.enabled ?? observed.enabled,
				skip_tls_verification: props.skipTlsVerification ?? observed.skip_tls_verification,
				metadata_disabled: props.metadataDisabled ?? observed.metadata_disabled,
			};
			// The key is never returned, so the last deployed props are the only
			// baseline. Adopting a record (no olds) sends it to be sure.
			const previousKey = olds?.apiKey;
			const keyChanged = previousKey === undefined || secretValue(previousKey) !== secretValue(props.apiKey);

			if (
				keyChanged ||
				observed.provider_id !== desired.provider_id ||
				observed.name !== desired.name ||
				observed.upstream_url !== desired.upstream_url ||
				!modelsEqual(observed.models, desired.models) ||
				!recordsEqual(observed.extra_values ?? {}, desired.extra_values) ||
				observed.identity_header_user_id !== desired.identity_header_user_id ||
				observed.identity_header_groups !== desired.identity_header_groups ||
				observed.enabled !== desired.enabled ||
				observed.skip_tls_verification !== desired.skip_tls_verification ||
				observed.metadata_disabled !== desired.metadata_disabled
			) {
				const updated = yield* agentNetworkProvidersProviderIdPut({
					providerId: observed.id,
					...desired,
					extra_values: { ...desired.extra_values },
					// Omitted, NetBird keeps the stored key.
					...(keyChanged ? { api_key: props.apiKey } : {}),
				});
				return toAttributes(updated);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			// Refused while a policy still references the provider; policies
			// depend on `providerId`, so a destroy removes them first.
			yield* catchNotFoundOrUnavailable(agentNetworkProvidersProviderIdDelete({ providerId: output.providerId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findProviderByName = (name: string) =>
	agentNetworkProvidersGet({}).pipe(
		Effect.map((providers): ApiProvider | undefined => providers.find(provider => provider.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

/** State may hand a persisted secret back as `Redacted` or as its plain value. */
const secretValue = (value: unknown) =>
	Redacted.isRedacted(value) ? Redacted.value(value) : typeof value === "string" ? value : undefined;

const toApiModel = (model: AgentNetworkProviderModel): ApiModel => ({
	id: model.id,
	input_per_1k: model.inputPer1k,
	output_per_1k: model.outputPer1k,
	...(model.cachedInputPer1k !== undefined ? { cached_input_per_1k: model.cachedInputPer1k } : {}),
	...(model.cacheReadPer1k !== undefined ? { cache_read_per_1k: model.cacheReadPer1k } : {}),
	...(model.cacheCreationPer1k !== undefined ? { cache_creation_per_1k: model.cacheCreationPer1k } : {}),
});

const fromApiModel = (model: ApiModel): AgentNetworkProviderModel => ({
	id: model.id,
	inputPer1k: model.input_per_1k,
	outputPer1k: model.output_per_1k,
	...(model.cached_input_per_1k !== undefined ? { cachedInputPer1k: model.cached_input_per_1k } : {}),
	...(model.cache_read_per_1k !== undefined ? { cacheReadPer1k: model.cache_read_per_1k } : {}),
	...(model.cache_creation_per_1k !== undefined ? { cacheCreationPer1k: model.cache_creation_per_1k } : {}),
});

/** NetBird does not promise to keep the order models were sent in. */
const normalizeModels = (models: ReadonlyArray<ApiModel>) =>
	JSON.stringify(
		[...models]
			.sort((a, b) => a.id.localeCompare(b.id))
			.map(model => [
				model.id,
				model.input_per_1k,
				model.output_per_1k,
				model.cached_input_per_1k ?? null,
				model.cache_read_per_1k ?? null,
				model.cache_creation_per_1k ?? null,
			]),
	);

const modelsEqual = (a: ReadonlyArray<ApiModel>, b: ReadonlyArray<ApiModel>) =>
	normalizeModels(a) === normalizeModels(b);

const recordsEqual = (a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>) =>
	JSON.stringify(Object.entries(a).sort(([x], [y]) => x.localeCompare(y))) ===
	JSON.stringify(Object.entries(b).sort(([x], [y]) => x.localeCompare(y)));

const toAttributes = (provider: ApiProvider): AgentNetworkProviderAttributes => ({
	providerId: provider.id,
	name: provider.name,
	catalogId: provider.provider_id,
	upstreamUrl: provider.upstream_url,
	models: provider.models.map(fromApiModel),
	enabled: provider.enabled,
	skipTlsVerification: provider.skip_tls_verification,
	metadataDisabled: provider.metadata_disabled,
	identityHeaderUserId: provider.identity_header_user_id,
	identityHeaderGroups: provider.identity_header_groups,
});
