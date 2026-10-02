import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { CredentialsFromEnv } from "@yorganci/netbird-api/Credentials";
import { dnsNameserversGet } from "@yorganci/netbird-api/dns";
import { groupsGet } from "@yorganci/netbird-api/groups";
import { peersGet } from "@yorganci/netbird-api/peers";
import { policiesGet } from "@yorganci/netbird-api/policies";
import { routesGet } from "@yorganci/netbird-api/routes";
import { usersGet } from "@yorganci/netbird-api/users";
import * as Command from "effect/cli/Command";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";

/**
 * NetBird credentials (`NB_PAT`, `NB_MANAGEMENT_URL`) come from
 * the environment, which `doppler run` fills from Doppler.
 */
const netbirdApi = Layer.mergeAll(CredentialsFromEnv, FetchHttpClient.layer);

const verifyAccess = Command.make("verify-access", {}).pipe(
	Command.withDescription(
		"Print NetBird users, groups, peers, routes, nameservers and policy rules to check zero-trust access before and after the Default policy cut-over",
	),
	Command.withHandler(
		Effect.fn(function* () {
			const [users, groups, peers, policies, routes, nameservers] = yield* Effect.all([
				usersGet({}),
				groupsGet({}),
				peersGet({}),
				policiesGet({}),
				routesGet({}),
				dnsNameserversGet({}),
			]).pipe(Effect.provide(netbirdApi));

			const peerById = new Map(peers.map(peer => [peer.id, peer]));
			const groupNameById = new Map(groups.map(group => [group.id, group.name]));
			const groupNames = (ids: ReadonlyArray<string> | null | undefined) =>
				(ids ?? []).map(id => groupNameById.get(id) ?? id).join(",");
			for (const user of users) {
				yield* Console.log(
					`USER\t${user.email}\trole=${user.role}\tstatus=${user.status}\tauto_groups=${JSON.stringify(user.auto_groups)}`,
				);
			}
			for (const group of groups) {
				const names = (group.peers ?? []).map(entry => {
					const id = typeof entry === "string" ? entry : entry.id;
					const peer = peerById.get(id);
					return peer ? peer.name || peer.dns_label : id;
				});
				yield* Console.log(`GROUP\t${group.name}\tpeers=${names.length}\t[${names.join(", ")}]`);
			}
			for (const peer of peers) {
				yield* Console.log(
					`PEER\t${peer.name || peer.dns_label}\tssh=${peer.ssh_enabled}\tconnected=${peer.connected}\tip=${peer.ip}`,
				);
			}
			for (const route of routes) {
				const via = route.peer
					? (peerById.get(route.peer)?.name ?? route.peer)
					: `groups:${groupNames(route.peer_groups)}`;
				yield* Console.log(
					`ROUTE\t${route.description}\tnetwork=${route.network ?? (route.domains ?? []).join(",")}\tvia=${via}\tenabled=${route.enabled}\tgroups=[${groupNames(route.groups)}]\taccess=[${groupNames(route.access_control_groups)}]`,
				);
			}
			for (const nameserver of nameservers) {
				yield* Console.log(
					`NAMESERVER\t${nameserver.name}\tprimary=${nameserver.primary}\tenabled=${nameserver.enabled}\tservers=[${nameserver.nameservers.map(entry => `${entry.ip}:${entry.port}`).join(",")}]\tgroups=[${groupNames(nameserver.groups)}]\tdomains=[${nameserver.domains.join(",")}]`,
				);
			}
			for (const policy of policies) {
				for (const rule of policy.rules ?? []) {
					yield* Console.log(
						`POLICY\t${policy.name}\tenabled=${policy.enabled}\tproto=${rule.protocol}\tsrc=${(rule.sources ?? []).map(s => s.name).join(",")}\tdst=${(rule.destinations ?? []).map(d => d.name).join(",")}\tports=${JSON.stringify(rule.ports ?? rule.port_ranges ?? null)}\tauthz=${JSON.stringify(rule.authorized_groups ?? null)}`,
					);
				}
			}
		}),
	),
);

const program = Command.run(verifyAccess, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
);

NodeRuntime.runMain(program as Effect.Effect<void>);
