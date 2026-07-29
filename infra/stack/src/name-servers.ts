import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";

export const NameServer = Schema.Struct({
	description: Schema.String,
	enabled: Schema.Boolean,
	primary: Schema.Boolean,
	port: Schema.Number,
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
		decode: SchemaGetter.transformOrFail(nameServers =>
			Effect.gen(function* () {
				const plans: Array<typeof NameServerPlan.Type> = [];
				for (const [hostKey, host] of Object.entries(nameServers) as Array<[string, typeof NameServerHost.Type]>) {
					for (const [nameserverKey, cfg] of Object.entries(host.nameservers) as Array<
						[string, typeof NameServer.Type]
					>) {
						if (cfg.primary && cfg.domains.length > 0) {
							return yield* Effect.fail(
								new SchemaIssue.InvalidValue(Option.some({ hostKey, nameserverKey }), {
									message: `nameserver "${nameserverKey}" on ${hostKey}: primary=true requires empty domains`,
								}),
							);
						}
						if (cfg.searchDomainsEnabled && cfg.domains.length === 0) {
							return yield* Effect.fail(
								new SchemaIssue.InvalidValue(Option.some({ hostKey, nameserverKey }), {
									message: `nameserver "${nameserverKey}" on ${hostKey}: searchDomainsEnabled requires non-empty domains`,
								}),
							);
						}
						plans.push({ hostKey, nameserverKey, cfg });
					}
				}
				return plans;
			}),
		),
		encode: encodeForbidden("NameServerPlan[] → NameServers encoding is not supported"),
	}),
);
