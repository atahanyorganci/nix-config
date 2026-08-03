import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";
import { PolicySourceGroupName, isPolicySourceGroupName } from "./inventory.ts";
import { NameServers, type NameServerPlan } from "./name-servers.ts";
import { HttpServices, type HttpHost, type HttpService } from "./reverse-proxy.ts";

export const AccessMatrixProtocol = Schema.Literals(["tcp", "udp", "icmp", "all", "netbird-ssh"]);
export type AccessMatrixProtocol = typeof AccessMatrixProtocol.Type;

export const AccessMatrixEntry = Schema.Struct({
	host: Schema.String,
	service: Schema.String,
	port: Schema.Number,
	protocol: AccessMatrixProtocol,
	allowedSourceGroups: Schema.Array(PolicySourceGroupName),
});
export type AccessMatrixEntry = typeof AccessMatrixEntry.Type;

export const AccessMatrix = Schema.Array(AccessMatrixEntry);
export type AccessMatrix = typeof AccessMatrix.Type;

/** Exposed HTTP services without explicit `expose.accessGroups` are admin-only on the mesh. */
const DEFAULT_HTTP_SOURCE_GROUPS: ReadonlyArray<string> = ["Admin"];

/** Resolvers answer over UDP and fall back to TCP for large responses. */
const DNS_PROTOCOLS: ReadonlyArray<AccessMatrixProtocol> = ["udp", "tcp"];

const sourceGroups = (
	label: string,
	groups: ReadonlyArray<string>,
): Effect.Effect<Array<PolicySourceGroupName>, SchemaIssue.InvalidValue> => {
	const unknown = groups.filter(group => !isPolicySourceGroupName(group));
	if (unknown.length > 0) {
		return Effect.fail(
			new SchemaIssue.InvalidValue(Option.some(groups), {
				message: `${label}: unknown NetBird group name(s) ${unknown.join(", ")} — expected Admin, Users, Servers, Agents or All`,
			}),
		);
	}
	return Effect.succeed([...new Set(groups.filter(isPolicySourceGroupName))]);
};

const httpEntries = (hostKey: string, serviceKey: string, cfg: HttpService) =>
	Effect.gen(function* () {
		const configured = cfg.expose.accessGroups.length > 0 ? cfg.expose.accessGroups : DEFAULT_HTTP_SOURCE_GROUPS;
		const allowedSourceGroups = yield* sourceGroups(`${hostKey}.${serviceKey}.expose.accessGroups`, configured);
		const entry: AccessMatrixEntry = {
			host: hostKey,
			service: serviceKey,
			port: cfg.port,
			protocol: "tcp",
			allowedSourceGroups,
		};
		return [entry];
	});

/** DNS is reachable from exactly the groups the nameserver is distributed to. */
const dnsEntries = (plan: NameServerPlan) =>
	Effect.gen(function* () {
		const allowedSourceGroups = yield* sourceGroups(`${plan.hostKey}.${plan.nameserverKey}.groups`, plan.cfg.groups);
		return DNS_PROTOCOLS.map(
			(protocol): AccessMatrixEntry => ({
				host: plan.hostKey,
				service: plan.nameserverKey,
				port: plan.cfg.port,
				protocol,
				allowedSourceGroups,
			}),
		);
	});

const nameServerPlansFrom = (nameServers: typeof NameServers.Type): Array<NameServerPlan> => {
	const plans: Array<NameServerPlan> = [];
	for (const [hostKey, host] of Object.entries(nameServers)) {
		for (const [nameserverKey, cfg] of Object.entries(host.nameservers)) {
			plans.push({ hostKey, nameserverKey, cfg });
		}
	}
	return plans;
};

const encodeForbidden = <T, E>(message: string) => SchemaGetter.forbidden<T, E>(() => message);

export const AccessMatrixFromFlake = Schema.Struct({
	httpServices: HttpServices,
	nameServers: NameServers,
}).pipe(
	Schema.decodeTo(AccessMatrix, {
		decode: SchemaGetter.transformOrFail(({ httpServices, nameServers }) =>
			Effect.gen(function* () {
				const entries: Array<AccessMatrixEntry> = [];

				for (const [hostKey, host] of Object.entries(httpServices) as Array<[string, HttpHost]>) {
					for (const [serviceKey, cfg] of Object.entries(host.services)) {
						if (!cfg.expose.enable) continue;
						entries.push(...(yield* httpEntries(hostKey, serviceKey, cfg)));
					}
				}

				for (const plan of nameServerPlansFrom(nameServers)) {
					entries.push(...(yield* dnsEntries(plan)));
				}

				entries.sort(
					(a, b) =>
						a.host.localeCompare(b.host) ||
						a.service.localeCompare(b.service) ||
						a.port - b.port ||
						a.protocol.localeCompare(b.protocol),
				);

				return entries;
			}),
		),
		encode: encodeForbidden("AccessMatrix -> flake encoding is not supported"),
	}),
);
