import * as NetBird from "@yorganci/netbird-alchemy";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Output from "alchemy/Output";
import { Stage } from "alchemy/Stage";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as String from "effect/String";
import { AccessMatrix, HomeInfra, Inventory, NameServers, NixExpr, Policies, ReverseProxy } from "../src/index.ts";
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

		const plans = yield* Schema.decodeEffect(ReverseProxy.ServicePlansFromHttpServices)({
			httpServices,
			domain: infra.domain,
		});

		if (Object.keys(httpServices).length > 0 && plans.length === 0) {
			return yield* Effect.die("no httpServices entries have expose.enable — nothing to publish");
		}

		if (plans.length > 0) {
			yield* NetBird.ReverseProxyDomain("YorganciDev", {
				domain: infra.domain,
			});
		}

		const peers: Record<string, NetBird.Peer> = {};
		const peerOutputs: Record<string, { hostname: NetBird.Peer["hostname"]; peerId: NetBird.Peer["peerId"] }> = {};
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
		const groupOutputs: Record<string, { groupId: NetBird.Group["groupId"]; name: NetBird.Group["name"] }> = {};
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

		// Built-in All group — adopt by name, never rewrite members, never delete.
		const allGroup = yield* NetBird.Group("All", { name: Policies.ALL_GROUP_NAME }).pipe(
			Alchemy.RemovalPolicy.retain(),
		);

		// The reverse proxy joins the mesh as embedded peers that are not in the
		// flake inventory and are omitted from /api/peers. Add those peers to this
		// group once in the dashboard (Peers → proxy-* → Groups). Without that,
		// allow-admin-proxy-tcp has an empty destination after Default is disabled,
		// and matrix rules that list Proxy as a source never match a peer.
		const proxyGroup = yield* NetBird.Group("Proxy", { name: Inventory.PROXY_GROUP_NAME });
		groupOutputs[Inventory.PROXY_GROUP_NAME] = {
			groupId: proxyGroup.groupId,
			name: proxyGroup.name,
		};

		const adminGroup = groupResources.Admin!;
		const usersGroup = groupResources.Users!;
		const serversGroup = groupResources.Servers!;
		const agentsGroup = groupResources.Agents!;

		const groupIdTable = Output.all(
			allGroup.groupId,
			adminGroup.groupId,
			usersGroup.groupId,
			serversGroup.groupId,
			agentsGroup.groupId,
			proxyGroup.groupId,
		).pipe(
			Output.map(
				([all, admin, users, servers, agents, proxy]): Record<string, string> => ({
					[Policies.ALL_GROUP_NAME]: all,
					Admin: admin,
					Users: users,
					Servers: servers,
					Agents: agents,
					[Inventory.PROXY_GROUP_NAME]: proxy,
				}),
			),
		);

		// NetBird setup created the owner; this adopts it and keeps every device
		// it enrolls in Admin. Retained so a stack destroy can never delete it.
		const owner = yield* NetBird.User("Owner", {
			email: me.email,
			name: me.name,
			isServiceUser: false,
			autoGroups: [adminGroup.groupId],
		}).pipe(Alchemy.RemovalPolicy.retain());
		const ownerOutput = {
			userId: owner.userId,
			email: owner.email,
			autoGroups: [adminGroup.groupId],
		};

		const marsPeer = peers.mars;
		if (!marsPeer) {
			return yield* Effect.die('NetBird peer "mars" is required for exit routes and Pi-hole DNS');
		}
		const exitGroups = Output.all(adminGroup.groupId, usersGroup.groupId).pipe(Output.map(ids => [...ids]));
		// One IPv4 default route defines the exit node. NetBird's network map
		// derives the ::/0 companion (network id "mars-exit-v6") for every
		// IPv6-capable peer, so an explicit ::/0 route only duplicates it.
		// The logical id and description are kept so the live route is adopted.
		yield* NetBird.Route("MarsExitV4", {
			description: "mars-exit-ipv4",
			networkId: "mars-exit",
			network: "0.0.0.0/0",
			peer: marsPeer.peerId,
			groups: exitGroups,
			masquerade: true,
			metric: 100,
			keepRoute: false,
		});

		const saturnPeer = peers.saturn;
		if (!saturnPeer) {
			return yield* Effect.die('NetBird peer "saturn" is required for the US exit route');
		}
		yield* NetBird.Route("SaturnExitV4", {
			description: "saturn-exit-ipv4",
			networkId: "saturn-exit",
			network: "0.0.0.0/0",
			peer: saturnPeer.peerId,
			groups: exitGroups,
			masquerade: true,
			metric: 200,
			skipAutoApply: true,
			keepRoute: false,
		});

		const services: Record<string, string> = {};
		for (const plan of plans) {
			const peer = peers[plan.hostKey]!;
			for (const groupName of ReverseProxy.groupNamesForPlan(plan)) {
				if (
					groupName !== Policies.ALL_GROUP_NAME &&
					groupName !== Inventory.PROXY_GROUP_NAME &&
					!Inventory.isNetBirdGroupName(groupName)
				) {
					return yield* Effect.die(
						`service "${plan.serviceKey}": unknown NetBird group "${groupName}" in expose.accessGroups or auth.distributionGroups`,
					);
				}
			}
			const auth = yield* ReverseProxy.decodeAuth(plan.cfg.auth);
			yield* NetBird.ReverseProxyService(
				String.pascalCase(plan.serviceKey),
				Output.all(peer.peerId, groupIdTable).pipe(
					Output.map(([peerId, groupIds]) => ReverseProxy.bindServiceProps(plan, auth, peerId, groupIds)),
				),
			);
			services[plan.serviceKey] = plan.domain;
		}

		const nsPlans = yield* Schema.decodeEffect(NameServers.NameServerPlansFromNameServers)(nameServers);
		const dns: Record<
			string,
			{ nameserverGroupId: NetBird.NameserverGroup["nsgroupId"]; host: string; ip: NetBird.Peer["ip"] }
		> = {};
		for (const plan of nsPlans) {
			const peer = peers[plan.hostKey];
			if (!peer) {
				return yield* Effect.die(`NetBird peer "${plan.hostKey}" not found for nameserver "${plan.nameserverKey}"`);
			}

			for (const groupName of plan.cfg.groups) {
				if (
					groupName !== Policies.ALL_GROUP_NAME &&
					groupName !== Inventory.PROXY_GROUP_NAME &&
					!Inventory.isNetBirdGroupName(groupName)
				) {
					return yield* Effect.die(`NetBird group "${groupName}" not found for nameserver "${plan.nameserverKey}"`);
				}
			}

			const ns = yield* NetBird.NameserverGroup(String.pascalCase(plan.nameserverKey), {
				name: plan.nameserverKey,
				description: plan.cfg.description || `DNS on ${plan.hostKey}`,
				nameservers: Output.map(peer.ip, ip => [{ ip, ns_type: "udp" as const, port: plan.cfg.port }]),
				enabled: plan.cfg.enabled,
				groups: Output.map(groupIdTable, groupIds =>
					plan.cfg.groups.map(groupName => {
						const id = groupIds[groupName];
						if (id === undefined) {
							throw new Error(`NetBird group "${groupName}" has no id for nameserver "${plan.nameserverKey}"`);
						}
						return id;
					}),
				),
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

		const allowRules = [
			...Policies.adminAllowAllRules(),
			...Policies.adminSshRules(),
			...Policies.adminProxyRules(),
			...Policies.serverSshRules(),
			...Policies.allowRulesFromMatrix(accessMatrix, inventory),
		];
		if (allowRules.length === 0) {
			return yield* Effect.die("access matrix produced no allow rules — check host netbird.group assignments");
		}

		for (const spec of allowRules) {
			yield* NetBird.Policy(Policies.allowPolicyLogicalId(spec.name), {
				name: Policies.policyNameForRule(spec.name),
				enabled: true,
				rules: Output.map(groupIdTable, groupIds => [Policies.bindPolicyRule(spec, groupIds)]),
				...(spec.description !== undefined ? { description: spec.description } : {}),
			});
		}

		// Adopt the dashboard All→All policy, keep it disabled (default deny),
		// and retain it so destroy never deletes the built-in rule.
		yield* NetBird.Policy("DisableDefault", {
			name: NetBird.DEFAULT_POLICY_NAME,
			description: "Retained built-in All→All policy — kept disabled for zero-trust default deny",
			enabled: false,
		}).pipe(Alchemy.RemovalPolicy.retain());

		return {
			peers: peerOutputs,
			groups: groupOutputs,
			services,
			dns,
			owner: ownerOutput,
			policies: {
				allowRuleCount: allowRules.length,
			},
		};
	}).pipe(Effect.orDie),
);
