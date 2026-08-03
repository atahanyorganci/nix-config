import * as NetBird from "@yorganci/netbird-alchemy";
import { groupsGet } from "@yorganci/netbird-api/groupsGet";
import { reverseProxiesClustersGet } from "@yorganci/netbird-api/reverseProxiesClustersGet";
import * as Cloudflare from "alchemy/Cloudflare";
import { Stage } from "alchemy/Stage";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as String from "effect/String";
import {
	AccessMatrix,
	HomeInfra,
	Inventory,
	NameServers,
	NixExpr,
	ReverseProxy,
	type HomeInfraGroupOutput,
	type HomeInfraNameserverOutput,
	type HomeInfraPeerOutput,
} from "../src/index.ts";
import { readNetbirdCredentials } from "../src/netbird-credentials.ts";

const Infra = Schema.Struct({
	domain: Schema.String,
	netbirdManagementDomain: Schema.String,
});

const REPO_ROOT = "../..";

const netbirdCredentials = Ref.makeUnsafe<Record<string, string>>({});

const peerLogicalId = (hostKey: string) => hostKey[0]!.toUpperCase() + hostKey.slice(1);

export default HomeInfra.make(
	{
		providers: Layer.mergeAll(
			NetBird.providers(NetBird.CredentialsFromRef(netbirdCredentials)),
			NixExpr.NixExprProvider(),
		),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const stage = yield* Stage;
		const { apiBaseUrl, apiToken } = yield* readNetbirdCredentials(stage);
		const token = Redacted.value(apiToken);
		if (!token) {
			return yield* Effect.die("NetBird AdminApiKey token is empty in NetbirdServer stack state");
		}
		yield* Ref.set(netbirdCredentials, {
			NETBIRD_API_TOKEN: token,
			NETBIRD_API_BASE_URL: apiBaseUrl,
		});

		const infraExpr = yield* NixExpr.NixExpr("Infra", {
			cwd: REPO_ROOT,
			expression: ".#infra",
		});
		const infra = yield* NixExpr.decode(infraExpr, Infra);

		const inventoryExpr = yield* NixExpr.NixExpr("Inventory", {
			cwd: REPO_ROOT,
			expression: ".#inventory",
		});
		const inventory = yield* NixExpr.decode(inventoryExpr, Inventory.Inventory);

		const httpServicesExpr = yield* NixExpr.NixExpr("HttpServices", {
			cwd: REPO_ROOT,
			expression: ".#httpServices",
		});
		const httpServices = yield* NixExpr.decode(httpServicesExpr, ReverseProxy.HttpServices);

		const nameServersExpr = yield* NixExpr.NixExpr("NameServers", {
			cwd: REPO_ROOT,
			expression: ".#nameServers",
		});
		const nameServers = yield* NixExpr.decode(nameServersExpr, NameServers.NameServers);

		yield* Schema.decodeEffect(AccessMatrix.AccessMatrixFromFlake)({
			httpServices,
			nameServers,
		});

		if (Object.keys(httpServices).length === 0 && Object.keys(nameServers).length === 0) {
			return yield* Effect.die(
				"flake.httpServices and flake.nameServers are empty — enable httpServices or nameServers in host modules first",
			);
		}

		const inventoryHostKeys = Inventory.inventoryHosts(inventory).map(([hostKey]) => hostKey);
		const hostKeys = [
			...new Set([
				...Object.keys(httpServices),
				...Object.keys(nameServers),
				...inventoryHostKeys.filter(hostKey => {
					const host = inventory.managedTargets[hostKey] ?? inventory.agentHolders[hostKey];
					return host?.netbird.group !== null;
				}),
			]),
		];

		const existingGroups = yield* groupsGet({}).pipe(Effect.orDie);
		const allGroup = existingGroups.find(group => group.name === "All");
		if (!allGroup) {
			return yield* Effect.die("NetBird All group not found");
		}

		const groupResources: Record<string, NetBird.Group> = {};
		const groupOutputs: Record<string, HomeInfraGroupOutput> = {};
		for (const groupName of Inventory.ZERO_TRUST_GROUP_NAMES) {
			const group = yield* NetBird.Group(groupName, { name: groupName });
			groupResources[groupName] = group;
			groupOutputs[groupName] = {
				groupId: group.groupId,
				name: group.name,
			};
		}
		const groupByName = new Map<string, string | NetBird.Group["groupId"]>();
		for (const groupName of Inventory.ZERO_TRUST_GROUP_NAMES) {
			groupByName.set(groupName, groupResources[groupName]!.groupId);
		}
		groupByName.set("All", allGroup.id);

		const plans = yield* Schema.decodeEffect(ReverseProxy.ServicePlansFromHttpServices)({
			httpServices,
			domain: infra.domain,
		});

		if (Object.keys(httpServices).length > 0 && plans.length === 0) {
			return yield* Effect.die("no httpServices entries have expose.enable — nothing to publish");
		}

		const clusters = yield* reverseProxiesClustersGet({}).pipe(Effect.orDie);
		const targetCluster = clusters.find(entry => entry.online)?.address ?? clusters[0]?.address ?? infra.domain;

		if (plans.length > 0) {
			yield* NetBird.ReverseProxyDomain("YorganciDev", {
				domain: infra.domain,
				targetCluster,
			});
		}

		const peers: Record<string, NetBird.Peer> = {};
		const peerOutputs: Record<string, HomeInfraPeerOutput> = {};
		for (const hostKey of hostKeys) {
			const host = inventory.managedTargets[hostKey] ?? inventory.agentHolders[hostKey];
			const peer = yield* NetBird.Peer(peerLogicalId(hostKey), {
				host: hostKey,
				...(host
					? {
							loginExpirationEnabled: host.netbird.loginExpirationEnabled,
							inactivityExpirationEnabled: host.netbird.inactivityExpirationEnabled,
						}
					: {}),
			});
			peers[hostKey] = peer;
			peerOutputs[hostKey] = {
				hostname: peer.hostname,
				peerId: peer.peerId,
			};
		}

		const hostsByGroup = Inventory.hostsByNetBirdGroup(inventory);
		for (const groupName of Inventory.ZERO_TRUST_GROUP_NAMES) {
			const memberHostKeys = hostsByGroup.get(groupName) ?? [];
			const memberPeerIds = memberHostKeys
				.filter(hostKey => peers[hostKey] !== undefined)
				.map(hostKey => peers[hostKey]!.peerId);
			yield* NetBird.Group(groupName, {
				name: groupName,
				peers: memberPeerIds,
			});
		}

		const services: Record<string, string> = {};
		for (const plan of plans) {
			const peer = peers[plan.hostKey]!;
			const props = yield* Schema.decodeEffect(ReverseProxy.ReverseProxyServicePropsFromPlan)({
				plan,
				defaultAccessGroup: allGroup.id,
				peerId: peer.peerId,
			});
			yield* NetBird.ReverseProxyService(String.pascalCase(plan.serviceKey), props);
			services[plan.serviceKey] = plan.domain;
		}

		const nsPlans = yield* Schema.decodeEffect(NameServers.NameServerPlansFromNameServers)(nameServers);
		const dns: Record<string, HomeInfraNameserverOutput> = {};
		for (const plan of nsPlans) {
			const peer = peers[plan.hostKey];
			if (!peer) {
				return yield* Effect.die(`NetBird peer "${plan.hostKey}" not found for nameserver "${plan.nameserverKey}"`);
			}

			const distributionGroups: Array<string | NetBird.Group["groupId"]> = [];
			for (const groupName of plan.cfg.groups) {
				const id = groupByName.get(groupName);
				if (!id) {
					return yield* Effect.die(`NetBird group "${groupName}" not found for nameserver "${plan.nameserverKey}"`);
				}
				distributionGroups.push(id);
			}

			const ns = yield* NetBird.NameserverGroup(String.pascalCase(plan.nameserverKey), {
				name: plan.nameserverKey,
				description: plan.cfg.description || `DNS on ${plan.hostKey}`,
				nameservers: [{ ip: peer.ip, ns_type: "udp", port: plan.cfg.port }],
				enabled: plan.cfg.enabled,
				groups: distributionGroups,
				primary: plan.cfg.primary,
				domains: [...plan.cfg.domains],
				search_domains_enabled: plan.cfg.searchDomainsEnabled,
			});

			dns[plan.nameserverKey] = {
				nameserverGroupId: ns.nsgroupId,
				host: plan.hostKey,
				ip: peer.ip,
			};
		}

		return {
			peers: peerOutputs,
			groups: groupOutputs,
			services,
			dns,
		};
	}).pipe(Effect.orDie),
);
