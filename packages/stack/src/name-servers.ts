import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";
import { isIPv4 } from "node:net";

/** NetBird accepts 1–3 servers per nameserver group; the hosting peer takes one. */
export const MAX_FALLBACKS = 2;

export const NameServer = Schema.Struct({
	description: Schema.String,
	enabled: Schema.Boolean,
	primary: Schema.Boolean,
	port: Schema.Number,
	fallbacks: Schema.Array(Schema.String),
	groups: Schema.Array(Schema.String),
	domains: Schema.Array(Schema.String),
	searchDomainsEnabled: Schema.Boolean,
});
export type NameServer = typeof NameServer.Type;

export const NameServerHost = Schema.Struct({
	name: Schema.String,
	system: Schema.String,
	nameservers: Schema.Record(Schema.String, NameServer),
});
export type NameServerHost = typeof NameServerHost.Type;

export const NameServers = Schema.Record(Schema.String, NameServerHost);
export type NameServers = typeof NameServers.Type;

export const NameServerPlan = Schema.Struct({
	hostKey: Schema.String,
	nameserverKey: Schema.String,
	cfg: NameServer,
});
export type NameServerPlan = typeof NameServerPlan.Type;

const encodeForbidden = <T, E>(message: string) => SchemaGetter.forbidden<T, E>(() => message);

export const NameServerPlansFromNameServers = NameServers.pipe(
	Schema.decodeTo(Schema.Array(NameServerPlan), {
		decode: SchemaGetter.transformEffect(nameServers =>
			Effect.gen(function* () {
				const plans: Array<typeof NameServerPlan.Type> = [];
				for (const [hostKey, host] of Object.entries(nameServers) as Array<[string, typeof NameServerHost.Type]>) {
					for (const [nameserverKey, cfg] of Object.entries(host.nameservers) as Array<
						[string, typeof NameServer.Type]
					>) {
						if (cfg.primary && cfg.domains.length > 0) {
							return yield* Effect.fail(
								new SchemaIssue.InvalidValue(
									{
										message: `nameserver "${nameserverKey}" on ${hostKey}: primary=true requires empty domains`,
									},
									{ hostKey, nameserverKey },
								),
							);
						}
						if (cfg.fallbacks.length > MAX_FALLBACKS) {
							return yield* Effect.fail(
								new SchemaIssue.InvalidValue(
									{
										message: `nameserver "${nameserverKey}" on ${hostKey}: at most ${MAX_FALLBACKS} fallbacks (NetBird allows 3 servers per group)`,
									},
									{ hostKey, nameserverKey },
								),
							);
						}
						const badFallback = cfg.fallbacks.find(ip => !isIPv4(ip));
						if (badFallback !== undefined) {
							return yield* Effect.fail(
								new SchemaIssue.InvalidValue(
									{
										message: `nameserver "${nameserverKey}" on ${hostKey}: fallback "${badFallback}" is not an IPv4 address`,
									},
									{ hostKey, nameserverKey },
								),
							);
						}
						if (cfg.searchDomainsEnabled && cfg.domains.length === 0) {
							return yield* Effect.fail(
								new SchemaIssue.InvalidValue(
									{
										message: `nameserver "${nameserverKey}" on ${hostKey}: searchDomainsEnabled requires non-empty domains`,
									},
									{ hostKey, nameserverKey },
								),
							);
						}
						plans.push({ hostKey, nameserverKey, cfg });
					}
				}
				return plans;
			}),
		),
		encode: encodeForbidden("NameServerPlan[] -> NameServers encoding is not supported"),
	}),
);
