import { reverseProxiesServicesGet } from "@yorganci/netbird-api/reverseProxiesServicesGet";
import { reverseProxiesServicesPost } from "@yorganci/netbird-api/reverseProxiesServicesPost";
import { reverseProxiesServicesServiceIdDelete } from "@yorganci/netbird-api/reverseProxiesServicesServiceIdDelete";
import { reverseProxiesServicesServiceIdGet } from "@yorganci/netbird-api/reverseProxiesServicesServiceIdGet";
import { reverseProxiesServicesServiceIdPut } from "@yorganci/netbird-api/reverseProxiesServicesServiceIdPut";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound } from "../errors.ts";
import type * as Redacted from "effect/Redacted";

export type ProxyMode = "http" | "tcp" | "udp" | "tls";
export type TargetType = "peer" | "host" | "domain" | "subnet" | "cluster";
export type TargetProtocol = "http" | "https" | "tcp" | "udp";

export interface ReverseProxyTargetOptions {
	skipTlsVerify?: boolean;
	requestTimeout?: string;
	pathRewrite?: "preserve";
	customHeaders?: Record<string, string>;
	proxyProtocol?: boolean;
	sessionIdleTimeout?: string;
	directUpstream?: boolean;
}

export interface ReverseProxyTarget {
	targetId: string;
	targetType: TargetType;
	path?: string;
	protocol: TargetProtocol;
	host?: string;
	port: number;
	enabled: boolean;
	options?: ReverseProxyTargetOptions;
}

export interface ReverseProxyAuth {
	passwordAuth?: {
		enabled: boolean;
		password: Redacted.Redacted<string>;
	};
	pinAuth?: {
		enabled: boolean;
		pin: string;
	};
	bearerAuth?: {
		enabled: boolean;
		distributionGroups?: ReadonlyArray<string>;
	};
	linkAuth?: {
		enabled: boolean;
	};
	headerAuths?: ReadonlyArray<{
		enabled: boolean;
		header: string;
		value: string;
	}>;
}

export interface ReverseProxyAccessRestrictions {
	allowedCidrs?: ReadonlyArray<string>;
	blockedCidrs?: ReadonlyArray<string>;
	allowedCountries?: ReadonlyArray<string>;
	blockedCountries?: ReadonlyArray<string>;
	crowdsecMode?: "off" | "enforce" | "observe";
}

export interface ReverseProxyServiceProps {
	/**
	 * Display name. Used as the adoption key. If omitted, a unique name is
	 * generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/**
	 * Domain hostname the service is published on.
	 */
	domain: string;
	/**
	 * Proxy mode.
	 */
	mode?: ProxyMode;
	/**
	 * Listen port on the proxy cluster.
	 */
	listenPort?: number;
	/**
	 * Upstream targets.
	 */
	targets?: ReadonlyArray<ReverseProxyTarget>;
	/**
	 * Whether the service is enabled.
	 */
	enabled: boolean;
	/**
	 * Forward the original Host header to upstreams.
	 */
	passHostHeader?: boolean;
	/**
	 * Rewrite Location headers on redirects.
	 */
	rewriteRedirects?: boolean;
	/**
	 * Authentication configuration. Password values are `Redacted`.
	 */
	auth?: ReverseProxyAuth;
	/**
	 * IP / geo access restrictions.
	 */
	accessRestrictions?: ReverseProxyAccessRestrictions;
	/**
	 * Restrict the service to NetBird mesh clients only.
	 */
	private?: boolean;
	/**
	 * Group IDs allowed to access a private service.
	 */
	accessGroups?: ReadonlyArray<string>;
}

export interface ReverseProxyServiceAttributes {
	/** UUID of the service assigned by NetBird. */
	serviceId: string;
	/** Display name reported by NetBird. */
	name: string;
	/** Domain reported by NetBird. */
	domain: string;
	/** Whether the service is enabled. */
	enabled: boolean;
	/** Operational status from meta, when present. */
	status: string | undefined;
	/** Proxy mode reported by NetBird. */
	mode: ProxyMode | undefined;
	/** Listen port reported by NetBird. */
	listenPort: number | undefined;
	/** Upstream targets (camelCase). */
	targets: ReadonlyArray<ReverseProxyTarget>;
	/** Auth config with secrets preserved across reads when possible. */
	auth: ReverseProxyAuth | undefined;
	/** Access groups. */
	accessGroups: ReadonlyArray<string> | undefined;
	/** Private mesh-only flag. */
	private: boolean | undefined;
}

export type ReverseProxyService = Resource<
	"NetBird.ReverseProxyService",
	ReverseProxyServiceProps,
	ReverseProxyServiceAttributes
>;

/**
 * A NetBird reverse-proxy service — publishes an upstream behind a domain
 * on a proxy cluster.
 *
 * @resource
 * @product Reverse Proxy
 * @category NetBird
 * @section Creating a Service
 * @example Minimal HTTP service
 * ```typescript
 * const svc = yield* NetBird.ReverseProxyService("Web", {
 *   name: "web",
 *   domain: "app.example.com",
 *   enabled: true,
 *   targets: [{
 *     targetId: peerId,
 *     targetType: "peer",
 *     protocol: "http",
 *     port: 8080,
 *     enabled: true,
 *   }],
 * });
 * ```
 */
export const ReverseProxyService = Resource<ReverseProxyService>("NetBird.ReverseProxyService");

export const isReverseProxyService = (value: unknown): value is ReverseProxyService =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.ReverseProxyService";

type ApiTarget = {
	target_id: string;
	target_type: TargetType;
	path?: string;
	protocol: TargetProtocol;
	host?: string;
	port: number;
	enabled: boolean;
	options?: {
		skip_tls_verify?: boolean;
		request_timeout?: string;
		path_rewrite?: "preserve";
		custom_headers?: Record<string, string>;
		proxy_protocol?: boolean;
		session_idle_timeout?: string;
		direct_upstream?: boolean;
	};
};

type ApiAuth = {
	password_auth?: { enabled: boolean; password: Redacted.Redacted<string> };
	pin_auth?: { enabled: boolean; pin: string };
	bearer_auth?: { enabled: boolean; distribution_groups?: ReadonlyArray<string> | null };
	link_auth?: { enabled: boolean };
	header_auths?: ReadonlyArray<{ enabled: boolean; header: string; value: string }>;
};

type ApiService = {
	id: string;
	name: string;
	domain: string;
	mode?: ProxyMode;
	listen_port?: number;
	targets: ReadonlyArray<ApiTarget>;
	enabled: boolean;
	pass_host_header?: boolean;
	rewrite_redirects?: boolean;
	auth: ApiAuth;
	access_restrictions?: {
		allowed_cidrs?: ReadonlyArray<string>;
		blocked_cidrs?: ReadonlyArray<string>;
		allowed_countries?: ReadonlyArray<string>;
		blocked_countries?: ReadonlyArray<string>;
		crowdsec_mode?: "off" | "enforce" | "observe";
	};
	private?: boolean;
	access_groups?: ReadonlyArray<string>;
	meta: {
		status: string;
	};
};

export const ReverseProxyServiceProvider = () =>
	Provider.succeed(ReverseProxyService, {
		stables: ["serviceId", "name"],
		diff: ({ news }) =>
			Effect.sync(() => {
				if (!isResolved(news)) return undefined;
				// Config converges via PUT — no replacement.
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.serviceId) {
				const direct = yield* catchNotFound(reverseProxiesServicesServiceIdGet({ serviceId: output.serviceId }));
				if (direct) return toAttributes(direct, output.auth);
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findServiceByName(name);
			if (!existing) return undefined;
			return toAttributes(existing, output?.auth);
		}),
		list: Effect.fn(function* () {
			const all = yield* reverseProxiesServicesGet({});
			return all.map(s => toAttributes(s));
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as ReverseProxyServiceProps);
			const name = yield* resolveName(id, props.name);
			const body = toApiBody(name, props);

			let observed: ApiService | undefined;
			if (output?.serviceId) {
				const direct = yield* catchNotFound(reverseProxiesServicesServiceIdGet({ serviceId: output.serviceId }));
				if (direct) observed = direct;
			}
			if (!observed) {
				observed = yield* findServiceByName(name);
			}

			if (!observed) {
				const created = yield* reverseProxiesServicesPost(body).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findServiceByName(name);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created, props.auth);
			}

			if (needsUpdate(observed, props, name)) {
				const updated = yield* reverseProxiesServicesServiceIdPut({
					serviceId: observed.id,
					...body,
				});
				return toAttributes(updated, props.auth ?? output?.auth);
			}

			return toAttributes(observed, props.auth ?? output?.auth);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFound(reverseProxiesServicesServiceIdDelete({ serviceId: output.serviceId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findServiceByName = (name: string) =>
	reverseProxiesServicesGet({}).pipe(
		Effect.map(services => services.find(s => s.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const assignDefined = <T extends object>(target: T, key: keyof T, value: T[keyof T] | undefined) => {
	if (value !== undefined) {
		target[key] = value;
	}
};

const toApiTarget = (t: ReverseProxyTarget): ApiTarget => {
	const result: ApiTarget = {
		target_id: t.targetId,
		target_type: t.targetType,
		protocol: t.protocol,
		port: t.port,
		enabled: t.enabled,
	};
	assignDefined(result, "path", t.path);
	assignDefined(result, "host", t.host);
	if (t.options) {
		const apiOptions: NonNullable<ApiTarget["options"]> = {};
		assignDefined(apiOptions, "skip_tls_verify", t.options.skipTlsVerify);
		assignDefined(apiOptions, "request_timeout", t.options.requestTimeout);
		assignDefined(apiOptions, "path_rewrite", t.options.pathRewrite);
		assignDefined(apiOptions, "custom_headers", t.options.customHeaders);
		assignDefined(apiOptions, "proxy_protocol", t.options.proxyProtocol);
		assignDefined(apiOptions, "session_idle_timeout", t.options.sessionIdleTimeout);
		assignDefined(apiOptions, "direct_upstream", t.options.directUpstream);
		result.options = apiOptions;
	}
	return result;
};

const toApiAuth = (auth: ReverseProxyAuth | undefined): ApiAuth | undefined => {
	if (!auth) return undefined;
	const result: ApiAuth = {};
	if (auth.passwordAuth) {
		result.password_auth = {
			enabled: auth.passwordAuth.enabled,
			password: auth.passwordAuth.password,
		};
	}
	if (auth.pinAuth) {
		result.pin_auth = auth.pinAuth;
	}
	if (auth.bearerAuth) {
		const bearer: NonNullable<ApiAuth["bearer_auth"]> = {
			enabled: auth.bearerAuth.enabled,
		};
		assignDefined(bearer, "distribution_groups", auth.bearerAuth.distributionGroups);
		result.bearer_auth = bearer;
	}
	if (auth.linkAuth) {
		result.link_auth = auth.linkAuth;
	}
	if (auth.headerAuths) {
		result.header_auths = auth.headerAuths;
	}
	return result;
};

type ApiAccessRestrictions = {
	allowed_cidrs?: ReadonlyArray<string>;
	blocked_cidrs?: ReadonlyArray<string>;
	allowed_countries?: ReadonlyArray<string>;
	blocked_countries?: ReadonlyArray<string>;
	crowdsec_mode?: "off" | "enforce" | "observe";
};

const toApiAccessRestrictions = (r: ReverseProxyAccessRestrictions | undefined): ApiAccessRestrictions | undefined => {
	if (!r) return undefined;
	const result: ApiAccessRestrictions = {};
	assignDefined(result, "allowed_cidrs", r.allowedCidrs);
	assignDefined(result, "blocked_cidrs", r.blockedCidrs);
	assignDefined(result, "allowed_countries", r.allowedCountries);
	assignDefined(result, "blocked_countries", r.blockedCountries);
	assignDefined(result, "crowdsec_mode", r.crowdsecMode);
	return result;
};

const toApiBody = (name: string, props: ReverseProxyServiceProps) => {
	const body: {
		name: string;
		domain: string;
		enabled: boolean;
		mode?: ProxyMode;
		listen_port?: number;
		targets?: ReadonlyArray<ApiTarget>;
		pass_host_header?: boolean;
		rewrite_redirects?: boolean;
		auth?: ApiAuth;
		access_restrictions?: ApiAccessRestrictions;
		private?: boolean;
		access_groups?: ReadonlyArray<string>;
	} = {
		name,
		domain: props.domain,
		enabled: props.enabled,
	};
	assignDefined(body, "mode", props.mode);
	assignDefined(body, "listen_port", props.listenPort);
	assignDefined(body, "targets", props.targets?.map(toApiTarget));
	assignDefined(body, "pass_host_header", props.passHostHeader);
	assignDefined(body, "rewrite_redirects", props.rewriteRedirects);
	assignDefined(body, "auth", toApiAuth(props.auth));
	assignDefined(body, "access_restrictions", toApiAccessRestrictions(props.accessRestrictions));
	assignDefined(body, "private", props.private);
	assignDefined(body, "access_groups", props.accessGroups);
	return body;
};

const fromApiTarget = (t: ApiTarget): ReverseProxyTarget => {
	const result: ReverseProxyTarget = {
		targetId: t.target_id,
		targetType: t.target_type,
		protocol: t.protocol,
		port: t.port,
		enabled: t.enabled,
	};
	assignDefined(result, "path", t.path);
	assignDefined(result, "host", t.host);
	if (t.options) {
		const camelOptions: ReverseProxyTargetOptions = {};
		assignDefined(camelOptions, "skipTlsVerify", t.options.skip_tls_verify);
		assignDefined(camelOptions, "requestTimeout", t.options.request_timeout);
		assignDefined(camelOptions, "pathRewrite", t.options.path_rewrite);
		assignDefined(camelOptions, "customHeaders", t.options.custom_headers);
		assignDefined(camelOptions, "proxyProtocol", t.options.proxy_protocol);
		assignDefined(camelOptions, "sessionIdleTimeout", t.options.session_idle_timeout);
		assignDefined(camelOptions, "directUpstream", t.options.direct_upstream);
		result.options = camelOptions;
	}
	return result;
};

const fromApiAuth = (auth: ApiAuth | undefined, previous?: ReverseProxyAuth): ReverseProxyAuth | undefined => {
	if (!auth) return previous;
	const result: ReverseProxyAuth = {};
	if (auth.password_auth) {
		result.passwordAuth = {
			enabled: auth.password_auth.enabled,
			password: previous?.passwordAuth?.password ?? auth.password_auth.password,
		};
	}
	if (auth.pin_auth) {
		result.pinAuth = auth.pin_auth;
	}
	if (auth.bearer_auth) {
		const bearer: NonNullable<ReverseProxyAuth["bearerAuth"]> = {
			enabled: auth.bearer_auth.enabled,
		};
		assignDefined(bearer, "distributionGroups", auth.bearer_auth.distribution_groups ?? undefined);
		result.bearerAuth = bearer;
	}
	if (auth.link_auth) {
		result.linkAuth = auth.link_auth;
	}
	if (auth.header_auths) {
		result.headerAuths = auth.header_auths;
	}
	if (Object.keys(result).length === 0) return previous;
	return result;
};

const toAttributes = (service: ApiService, previousAuth?: ReverseProxyAuth): ReverseProxyServiceAttributes => ({
	serviceId: service.id,
	name: service.name,
	domain: service.domain,
	enabled: service.enabled,
	status: service.meta?.status,
	mode: service.mode,
	listenPort: service.listen_port,
	targets: service.targets.map(fromApiTarget),
	auth: fromApiAuth(service.auth, previousAuth),
	accessGroups: service.access_groups,
	private: service.private,
});

const sameStringArray = (a: ReadonlyArray<string> | undefined, b: ReadonlyArray<string> | undefined) => {
	const left = a ?? [];
	const right = b ?? [];
	if (left.length !== right.length) return false;
	return left.every((v, i) => v === right[i]);
};

const needsUpdate = (observed: ApiService, props: ReverseProxyServiceProps, name: string): boolean => {
	if (observed.name !== name) return true;
	if (observed.domain !== props.domain) return true;
	if (observed.enabled !== props.enabled) return true;
	if ((props.mode !== undefined || observed.mode !== undefined) && observed.mode !== props.mode) {
		return true;
	}
	if (
		(props.listenPort !== undefined || observed.listen_port !== undefined) &&
		observed.listen_port !== props.listenPort
	) {
		return true;
	}
	if (
		(props.passHostHeader !== undefined || observed.pass_host_header !== undefined) &&
		observed.pass_host_header !== props.passHostHeader
	) {
		return true;
	}
	if (
		(props.rewriteRedirects !== undefined || observed.rewrite_redirects !== undefined) &&
		observed.rewrite_redirects !== props.rewriteRedirects
	) {
		return true;
	}
	if ((props.private !== undefined || observed.private !== undefined) && observed.private !== props.private) {
		return true;
	}
	if (!sameStringArray(props.accessGroups, observed.access_groups)) return true;
	if (props.targets !== undefined) {
		const desired = JSON.stringify(props.targets.map(toApiTarget));
		const live = JSON.stringify(observed.targets);
		if (desired !== live) return true;
	}
	if (props.auth !== undefined) {
		// Compare non-secret shape; secret drift is intentional via PUT.
		const desiredEnabled = props.auth.passwordAuth?.enabled;
		const liveEnabled = observed.auth.password_auth?.enabled;
		if (desiredEnabled !== liveEnabled) return true;
	}
	return false;
};
