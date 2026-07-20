import { reverseProxiesDomainsDomainIdDelete } from "@yorganci/netbird-api/reverseProxiesDomainsDomainIdDelete";
import { reverseProxiesDomainsGet } from "@yorganci/netbird-api/reverseProxiesDomainsGet";
import { reverseProxiesDomainsPost } from "@yorganci/netbird-api/reverseProxiesDomainsPost";
import { isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound } from "../errors.ts";

export interface ReverseProxyDomainProps {
	/**
	 * Fully-qualified domain name registered for reverse-proxy services.
	 */
	domain: string;
	/**
	 * Target reverse-proxy cluster address (from `GET /api/reverse-proxies/clusters`).
	 */
	targetCluster: string;
}

export interface ReverseProxyDomainAttributes {
	/** UUID of the domain assigned by NetBird. */
	domainId: string;
	/** Domain name reported by NetBird. */
	domain: string;
	/** Whether DNS/ownership validation succeeded. */
	validated: boolean;
	/** Domain type (`free` or `custom`). */
	type: "free" | "custom";
	/** Cluster address the domain is bound to, when reported. */
	targetCluster: string | undefined;
}

export type ReverseProxyDomain = Resource<
	"NetBird.ReverseProxyDomain",
	ReverseProxyDomainProps,
	ReverseProxyDomainAttributes
>;

/**
 * A NetBird reverse-proxy domain used as an endpoint hostname for services.
 *
 * Domains have no update API — changing `targetCluster` replaces the domain.
 *
 * @resource
 * @product Reverse Proxy
 * @category NetBird
 * @section Creating a Domain
 * @example Custom domain on an account cluster
 * ```typescript
 * const domain = yield* NetBird.ReverseProxyDomain("AppDomain", {
 *   domain: "app.example.com",
 *   targetCluster: "proxy.example.com:443",
 * });
 * ```
 */
export const ReverseProxyDomain = Resource<ReverseProxyDomain>("NetBird.ReverseProxyDomain");

export const isReverseProxyDomain = (value: unknown): value is ReverseProxyDomain =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.ReverseProxyDomain";

type ApiDomain = {
	id: string;
	domain: string;
	validated: boolean;
	type: "free" | "custom";
	target_cluster?: string;
};

export const ReverseProxyDomainProvider = () =>
	Provider.succeed(ReverseProxyDomain, {
		stables: ["domainId", "domain"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				if (news.targetCluster !== olds.targetCluster) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ output, olds }) {
			if (output?.domainId) {
				const direct = yield* findDomainById(output.domainId);
				if (direct) return toAttributes(direct);
			}
			const domain = olds?.domain ?? output?.domain;
			if (!domain) return undefined;
			const existing = yield* findDomainByName(domain);
			if (!existing) return undefined;
			return toAttributes(existing);
		}),
		list: Effect.fn(function* () {
			const all = yield* reverseProxiesDomainsGet({});
			return all.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ news, output }) {
			const props = news ?? ({} as ReverseProxyDomainProps);
			const domain = props.domain;
			const targetCluster = props.targetCluster;

			let observed: ApiDomain | undefined;
			if (output?.domainId) {
				observed = yield* findDomainById(output.domainId);
			}
			if (!observed) {
				observed = yield* findDomainByName(domain);
			}

			if (!observed) {
				// Domains POST is typed as Service in the OpenAPI (spec quirk).
				// Re-list after create to capture the real Domain record.
				yield* reverseProxiesDomainsPost({
					domain,
					target_cluster: targetCluster,
				}).pipe(
					Effect.asVoid,
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findDomainByName(domain);
							if (existing) return;
							return yield* Effect.fail(err);
						}),
					),
				);
				const created = yield* findDomainByName(domain);
				if (!created) {
					return yield* Effect.die(new Error(`Domain "${domain}" was created but not returned by list`));
				}
				return toAttributes(created);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFound(reverseProxiesDomainsDomainIdDelete({ domainId: output.domainId }));
		}),
	});

const listDomains = () =>
	reverseProxiesDomainsGet({}).pipe(Effect.catch(() => Effect.succeed([] as ReadonlyArray<ApiDomain>)));

const findDomainById = (domainId: string) =>
	listDomains().pipe(Effect.map(domains => domains.find(d => d.id === domainId)));

const findDomainByName = (domain: string) =>
	listDomains().pipe(Effect.map(domains => domains.find(d => d.domain === domain)));

const toAttributes = (domain: ApiDomain): ReverseProxyDomainAttributes => ({
	domainId: domain.id,
	domain: domain.domain,
	validated: domain.validated,
	type: domain.type,
	targetCluster: domain.target_cluster,
});
