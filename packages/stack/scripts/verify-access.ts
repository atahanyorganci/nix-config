import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import {
	agentNetworkGuardrailsGet,
	agentNetworkPoliciesGet,
	agentNetworkProvidersGet,
	agentNetworkSettingsGet,
} from "@yorganci/netbird-api/agent_network";
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
		"Print NetBird users, groups, peers, routes, nameservers, policy rules and the Agent Network to check zero-trust access before and after the Default policy cut-over",
	),
	Command.withHandler(
		Effect.fn(function* () {
			const [
				users,
				groups,
				peers,
				policies,
				routes,
				nameservers,
				agentGateway,
				agentProviders,
				agentGuardrails,
				agentPolicies,
			] = yield* Effect.all([
				usersGet({}),
				groupsGet({}),
				peersGet({}),
				policiesGet({}),
				routesGet({}),
				dnsNameserversGet({}),
				agentNetworkSettingsGet({}),
				agentNetworkProvidersGet({}),
				agentNetworkGuardrailsGet({}),
				agentNetworkPoliciesGet({}),
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
			yield* Console.log(
				agentGateway.endpoint === ""
					? "AGENT_GATEWAY\tnot bootstrapped"
					: `AGENT_GATEWAY\t${agentGateway.endpoint}\tproxy=${agentGateway.proxy_address}\tlogs=${agentGateway.enable_log_collection}\tprompts=${agentGateway.enable_prompt_collection}\tredact_pii=${agentGateway.redact_pii}\tretention_days=${agentGateway.access_log_retention_days ?? ""}`,
			);
			const providerNameById = new Map(agentProviders.map(provider => [provider.id, provider.name]));
			const guardrailNameById = new Map(agentGuardrails.map(guardrail => [guardrail.id, guardrail.name]));
			for (const provider of agentProviders) {
				yield* Console.log(
					`AGENT_PROVIDER\t${provider.name}\tcatalog=${provider.provider_id}\tupstream=${provider.upstream_url}\tenabled=${provider.enabled}\tmodels=[${provider.models.map(model => model.id).join(",")}]`,
				);
			}
			for (const guardrail of agentGuardrails) {
				const { model_allowlist: allowlist, prompt_capture: capture } = guardrail.checks;
				yield* Console.log(
					`AGENT_GUARDRAIL\t${guardrail.name}\tallowlist=${allowlist.enabled ? `[${allowlist.models.join(",")}]` : "off"}\tprompt_capture=${capture.enabled}\tredact_pii=${capture.redact_pii}`,
				);
			}
			for (const policy of agentPolicies) {
				const { token_limit: tokens, budget_limit: budget } = policy.limits;
				yield* Console.log(
					`AGENT_POLICY\t${policy.name}\tenabled=${policy.enabled}\tsrc=${groupNames(policy.source_groups)}\tproviders=[${policy.destination_provider_ids.map(id => providerNameById.get(id) ?? id).join(",")}]\tguardrails=[${policy.guardrail_ids.map(id => guardrailNameById.get(id) ?? id).join(",")}]\ttokens=${tokens.enabled ? `${tokens.group_cap}/group,${tokens.user_cap}/user per ${tokens.window_seconds}s` : "uncapped"}\tbudget=${budget.enabled ? `$${budget.group_cap_usd}/group,$${budget.user_cap_usd}/user per ${budget.window_seconds}s` : "uncapped"}`,
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
