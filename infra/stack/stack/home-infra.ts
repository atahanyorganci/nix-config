import * as NetBird from "@yorganci/netbird-alchemy";
import { groupsGet } from "@yorganci/netbird-api/groupsGet";
import { reverseProxiesClustersGet } from "@yorganci/netbird-api/reverseProxiesClustersGet";
import * as Alchemy from "alchemy";
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
	Policies,
	ReverseProxy,
	type HomeInfraGroupOutput,
	type HomeInfraNameserverOutput,
	type HomeInfraOwnerOutput,
	type HomeInfraPeerOutput,
} from "../src/index.ts";
import { readNetbirdCredentials } from "../src/netbird-credentials.ts";

const Infra = Schema.Struct({
	domain: Schema.String,
	netbirdManagementDomain: Schema.String,
});

const Me = Schema.Struct({
	name: Schema.String,
	email: Schema.String,
	username: Schema.String,
});

const REPO_ROOT = "../..";
/**
 * `ALCHEMY_PLAN=1` plans fully offline: in-memory state, stub credentials and
 * no management API calls, so the stack can be validated without a login.
 */
const PLAN_MODE = Bun.env.ALCHEMY_PLAN === "1";
/**
 * Cut-over switch for NetBird's dashboard "Default" All->All policy. Leave it
 * unset for a first deploy so only the allow rules are added, verify access
 * from every group, then redeploy with NETBIRD_DISABLE_DEFAULT_POLICY=1.
 * Unsetting it again (or destroying the stack) re-enables Default.
 */
const DISABLE_DEFAULT_POLICY = Bun.env.NETBIRD_DISABLE_DEFAULT_POLICY === "1";

const netbirdCredentials = Ref.makeUnsafe<Record<string, string>>({});

const peerLogicalId = (hostKey: string) => hostKey[0]!.toUpperCase() + hostKey.slice(1);

const readStackCredentials = (stage: string) =>
	PLAN_MODE
		? Effect.succeed({
				apiBaseUrl: Bun.env.NETBIRD_API_BASE_URL ?? "https://netbird.example.com",
				apiToken: Redacted.make(Bun.env.NETBIRD_API_TOKEN ?? "plan-token"),
			})
		: readNetbirdCredentials(stage);

export default HomeInfra.make(
	{
		providers: Layer.mergeAll(
			NetBird.providers(NetBird.CredentialsFromRef(netbirdCredentials)),
			NixExpr.NixExprProvider(),
		),
		state: PLAN_MODE ? Alchemy.inMemoryState() : Cloudflare.state(),
	},
	Effect.gen(function* () {
		const stage = yield* Stage;
		const { apiBaseUrl, apiToken } = yield* readStackCredentials(stage);
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

		const meExpr = yield* NixExpr.NixExpr("Me", {
			cwd: REPO_ROOT,
			expression: ".#me",
		});
		const me = yield* NixExpr.decode(meExpr, Me);

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

		const accessMatrix = yield* Schema.decodeEffect(AccessMatrix.AccessMatrixFromFlake)({
			httpServices,
			nameServers,
		});

		if (Object.keys(httpServices).length === 0 && Object.keys(nameServers).length === 0) {
			return yield* Effect.die(
				"flake.httpServices and flake.nameServers are empty — enable httpServices or nameServers in host modules first",
			);
		}

		const managedHostKeys = Object.entries(inventory.managedTargets)
			.filter(([, host]) => host.netbird.group !== null && Inventory.isPeerGroupName(host.netbird.group))
			.map(([hostKey]) => hostKey);
		const hostKeys = [...new Set([...Object.keys(httpServices), ...Object.keys(nameServers), ...managedHostKeys])];

		const existingGroups = PLAN_MODE
			? [{ id: "plan-all-group", name: "All" }]
			: yield* groupsGet({}).pipe(Effect.orDie);
		const allGroup = existingGroups.find(group => group.name === "All");
		if (!allGroup) {
			return yield* Effect.die("NetBird All group not found");
		}

		const plans = yield* Schema.decodeEffect(ReverseProxy.ServicePlansFromHttpServices)({
			httpServices,
			domain: infra.domain,
		});

		if (Object.keys(httpServices).length > 0 && plans.length === 0) {
			return yield* Effect.die("no httpServices entries have expose.enable — nothing to publish");
		}

		const clusters = PLAN_MODE
			? [{ address: infra.domain, online: true }]
			: yield* reverseProxiesClustersGet({}).pipe(Effect.orDie);
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
				// OpenSSH on :22 is the login path. NetBird's embedded SSH (0.75)
				// uses util-linux login on NixOS and ends sessions with nologin.
				sshEnabled: false,
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
		const groupResources: Record<string, NetBird.Group> = {};
		const groupOutputs: Record<string, HomeInfraGroupOutput> = {};
		for (const groupName of Inventory.ZERO_TRUST_GROUP_NAMES) {
			// Admin and Users are filled by NetBird login (user auto_groups), so only
			// the infra groups get their member list rewritten from inventory.
			const group = Inventory.isPeerGroupName(groupName)
				? yield* NetBird.Group(groupName, {
						name: groupName,
						peers: (hostsByGroup.get(groupName) ?? [])
							.filter(hostKey => peers[hostKey] !== undefined)
							.map(hostKey => peers[hostKey]!.peerId),
					})
				: yield* NetBird.Group(groupName, { name: groupName });
			groupResources[groupName] = group;
			groupOutputs[groupName] = {
				groupId: group.groupId,
				name: group.name,
			};
		}
		const groupIdsByName: Record<string, string | NetBird.Group["groupId"]> = { All: allGroup.id };
		for (const groupName of Inventory.ZERO_TRUST_GROUP_NAMES) {
			groupIdsByName[groupName] = groupResources[groupName]!.groupId;
		}

		// The reverse proxy joins the mesh as an embedded peer that is not in the
		// flake inventory, so add it to this group once in the dashboard. Every
		// exposed service allows the group; without it, disabling Default would
		// cut the proxy off from its targets.
		const proxyGroup = yield* NetBird.Group("Proxy", { name: Inventory.PROXY_GROUP_NAME });
		groupIdsByName[Inventory.PROXY_GROUP_NAME] = proxyGroup.groupId;
		groupOutputs[Inventory.PROXY_GROUP_NAME] = {
			groupId: proxyGroup.groupId,
			name: proxyGroup.name,
		};

		const adminGroupId = groupResources.Admin!.groupId;

		// NetBird setup created the owner; this adopts it and keeps every device
		// it enrolls in Admin. Retained so a stack destroy can never delete it.
		const owner = yield* NetBird.User("Owner", {
			email: me.email,
			name: me.name,
			isServiceUser: false,
			autoGroups: [adminGroupId],
		}).pipe(Alchemy.RemovalPolicy.retain());
		const ownerOutput: HomeInfraOwnerOutput = {
			userId: owner.userId,
			email: owner.email,
			autoGroups: [adminGroupId],
		};

		const usersGroupId = groupResources.Users!.groupId;

		const marsPeer = peers.mars;
		if (!marsPeer) {
			return yield* Effect.die('NetBird peer "mars" is required for exit routes and Pi-hole DNS');
		}
		const exitGroups = [adminGroupId, usersGroupId];
		yield* NetBird.Route("MarsExitV4", {
			description: "mars-exit-ipv4",
			networkId: "mars-exit",
			network: "0.0.0.0/0",
			peer: marsPeer.peerId,
			groups: exitGroups,
			accessControlGroups: exitGroups,
			masquerade: true,
			metric: 100,
			keepRoute: false,
		});
		yield* NetBird.Route("MarsExitV6", {
			description: "mars-exit-ipv6",
			networkId: "mars-exit",
			network: "::/0",
			peer: marsPeer.peerId,
			groups: exitGroups,
			accessControlGroups: exitGroups,
			masquerade: true,
			metric: 100,
			keepRoute: false,
		});

		const services: Record<string, string> = {};
		for (const plan of plans) {
			const peer = peers[plan.hostKey]!;
			const props = yield* Schema.decodeEffect(ReverseProxy.ReverseProxyServicePropsFromPlan)({
				plan,
				defaultAccessGroup: adminGroupId,
				groupIdsByName,
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
				const id = groupIdsByName[groupName];
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

		const serversGroupId = groupResources.Servers!.groupId;
		const agentsGroupId = groupResources.Agents!.groupId;
		const resolveGroupId = (groupName: Inventory.NetBirdGroupName | Inventory.PolicySourceGroupName) =>
			groupIdsByName[groupName]! as unknown as string;

		const allowRules = [
			...Policies.adminAllowAllRules(adminGroupId as unknown as string, allGroup.id),
			...Policies.adminSshRules(adminGroupId as unknown as string, allGroup.id),
			...Policies.serverSshRules(serversGroupId as unknown as string, agentsGroupId as unknown as string),
			...Policies.allowRulesFromMatrix(accessMatrix, inventory, resolveGroupId),
		];
		if (allowRules.length === 0) {
			return yield* Effect.die("access matrix produced no allow rules — check host netbird.group assignments");
		}

		for (const rule of allowRules) {
			const props = {
				name: Policies.policyNameForRule(rule.name),
				enabled: true,
				rules: [rule],
				...(rule.description !== undefined ? { description: rule.description } : {}),
			};
			// Alchemy types Policy's logical id as a string literal; matrix rule names are dynamic.
			yield* NetBird.Policy(Policies.allowPolicyLogicalId(rule.name) as "AllowAdminAll", props);
		}

		// The dashboard All->All policy is adopted, never deleted, and only
		// disabled once the cut-over switch is set.
		yield* NetBird.Policy("LegacyDefault", {
			name: NetBird.DEFAULT_POLICY_NAME,
			enabled: !DISABLE_DEFAULT_POLICY,
		});

		return {
			peers: peerOutputs,
			groups: groupOutputs,
			services,
			dns,
			owner: ownerOutput,
			policies: {
				allowRuleCount: allowRules.length,
				legacyDefaultDisabled: DISABLE_DEFAULT_POLICY,
			},
		};
	}).pipe(Effect.orDie),
);
