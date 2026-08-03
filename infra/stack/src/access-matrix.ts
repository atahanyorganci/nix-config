import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import { NetBirdGroupName, type NetBirdGroupName as GroupName } from "./inventory.ts";
import { NameServers, type NameServerPlan } from "./name-servers.ts";
import { HttpServices, type HttpService, type HttpHost } from "./reverse-proxy.ts";

export const AccessMatrixProtocol = Schema.Literals(["tcp", "udp", "icmp", "all", "netbird-ssh"]);
export type AccessMatrixProtocol = typeof AccessMatrixProtocol.Type;

export const AccessMatrixEntry = Schema.Struct({
	host: Schema.String,
	service: Schema.String,
	port: Schema.Number,
	protocol: AccessMatrixProtocol,
	allowedSourceGroups: Schema.Array(NetBirdGroupName),
});
export type AccessMatrixEntry = typeof AccessMatrixEntry.Type;

export const AccessMatrix = Schema.Array(AccessMatrixEntry);
export type AccessMatrix = typeof AccessMatrix.Type;

const defaultHttpSourceGroups = (serviceKey: string, cfg: HttpService): ReadonlyArray<GroupName> => {
	if (cfg.expose.accessGroups.length > 0) {
		// accessGroups in host config are NetBird group IDs today; matrix uses names.
		// Until hosts migrate to group names, fall back to role-based defaults.
	}
	if (!cfg.expose.private) {
		return ["Admin", "Users", "Servers", "Agents"];
	}
	return serviceDefaults[serviceKey] ?? ["Admin"];
};

const serviceDefaults: Record<string, ReadonlyArray<GroupName>> = {
	hermes: ["Admin"],
	pihole: ["Admin", "Users"],
	"home-assistant": ["Admin", "Users"],
	tv: ["Admin"],
	film: ["Admin"],
	indexer: ["Admin"],
	download: ["Admin"],
	watch: ["Admin", "Users"],
};

const nameServerDefaults = (nameserverKey: string): ReadonlyArray<GroupName> => {
	if (nameserverKey === "pihole-primary") {
		return ["Admin", "Users", "Servers", "Agents"];
	}
	return ["Admin", "Users", "Servers", "Agents"];
};

const sshEntry = (hostKey: string): AccessMatrixEntry => ({
	host: hostKey,
	service: "ssh",
	port: 22,
	protocol: "netbird-ssh",
	allowedSourceGroups: ["Admin"],
});

const httpEntry = (hostKey: string, serviceKey: string, cfg: HttpService): AccessMatrixEntry => ({
	host: hostKey,
	service: serviceKey,
	port: cfg.port,
	protocol: cfg.protocol === "https" ? "tcp" : "tcp",
	allowedSourceGroups: [...defaultHttpSourceGroups(serviceKey, cfg)],
});

const dnsEntry = (plan: NameServerPlan): AccessMatrixEntry => ({
	host: plan.hostKey,
	service: plan.nameserverKey,
	port: plan.cfg.port,
	protocol: "udp",
	allowedSourceGroups: [...nameServerDefaults(plan.nameserverKey)],
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
		decode: SchemaGetter.transform(({ httpServices, nameServers }) => {
			const entries: Array<AccessMatrixEntry> = [];

			for (const [hostKey, host] of Object.entries(httpServices) as Array<[string, HttpHost]>) {
				entries.push(sshEntry(hostKey));
				for (const [serviceKey, cfg] of Object.entries(host.services)) {
					if (!cfg.expose.enable) continue;
					entries.push(httpEntry(hostKey, serviceKey, cfg));
				}
			}

			for (const plan of nameServerPlansFrom(nameServers)) {
				if (!entries.some(entry => entry.host === plan.hostKey && entry.service === "ssh")) {
					entries.push(sshEntry(plan.hostKey));
				}
				entries.push(dnsEntry(plan));
			}

			entries.sort((a, b) => a.host.localeCompare(b.host) || a.service.localeCompare(b.service) || a.port - b.port);

			return entries;
		}),
		encode: encodeForbidden("AccessMatrix → flake encoding is not supported"),
	}),
);
