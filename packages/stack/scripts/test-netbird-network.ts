import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { CredentialsFromEnv } from "@yorganci/netbird-api/Credentials";
import { dnsNameserversGet } from "@yorganci/netbird-api/dns";
import { groupsGet } from "@yorganci/netbird-api/groups";
import { peersGet } from "@yorganci/netbird-api/peers";
import { policiesGet } from "@yorganci/netbird-api/policies";
import { routesGet } from "@yorganci/netbird-api/routes";
import { reverseProxiesClustersGet, reverseProxiesServicesGet } from "@yorganci/netbird-api/services";
import * as Command from "effect/cli/Command";
import * as Flag from "effect/cli/Flag";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { promises as dns } from "node:dns";
import { isIPv4 } from "node:net";

/** Inventory hosts that should normally be online on the mesh. */

const REQUIRED_PEERS = ["mars", "mercury", "venus", "jupiter"] as const;

/** On Pi-hole's blocklist; resolves to 0.0.0.0 only when Pi-hole answers. */
const BLOCKED_PROBE_DOMAIN = "doubleclick.net";

/** Segment groups HomeInfra always maintains. */
const REQUIRED_GROUPS = ["Admin", "Users", "Servers", "Agents", "Proxy", "All"] as const;

/** Core allow policies that must stay enabled under default-deny. */
const REQUIRED_POLICIES = [
	"allow-admin-tcp",
	"allow-admin-udp",
	"allow-admin-icmp",
	"allow-admin-ssh",
	"allow-admin-proxy-tcp",
] as const;

const timeoutFlag = Flag.Int("timeout-ms").pipe(
	Flag.withDescription("Per-domain HTTPS probe timeout in milliseconds"),
	Flag.withDefault(12_000),
);

const domainsFlag = Flag.String("domain").pipe(
	Flag.withDescription(
		"Comma-separated domains to probe (defaults to every enabled reverse-proxy service from the API)",
	),
	Flag.optional,
	Flag.map(domain =>
		Option.isNone(domain)
			? []
			: domain.value
					.split(",")
					.map(entry => entry.trim())
					.filter(Boolean),
	),
);

/**
 * NetBird credentials (`NB_PAT`, `NB_MANAGEMENT_URL`) come from
 * the environment, which `doppler run` fills from Doppler.
 */
const netbirdApi = Layer.mergeAll(CredentialsFromEnv, FetchHttpClient.layer);

type Check = {
	name: string;
	ok: boolean;
	detail: string;
	/** Soft checks warn but do not fail the script. */
	soft?: boolean;
};

const isMeshIpv4 = (ip: string) => {
	if (!isIPv4(ip)) return false;
	const [a, b] = ip.split(".").map(Number);
	// RFC 6598 shared address space used by NetBird (100.64.0.0/10)
	return a === 100 && b !== undefined && b >= 64 && b <= 127;
};

/**
 * Resolve through the OS resolver, the same path applications take. Not
 * `dns.resolve4`: c-ares reads every nameserver (NetBird's resolver and the
 * LAN router) and after a few queries prefers the lowest-latency one, so it
 * drifts to the router and gets public answers for mesh-only names.
 */
const lookupSystem = (domain: string) =>
	Effect.tryPromise({
		try: () => dns.lookup(domain, { family: 4, all: true }),
		catch: error => error,
	}).pipe(
		Effect.map(results => results.map(result => result.address)),
		Effect.orElseSucceed(() => [] as Array<string>),
	);

const probeHttps = (url: string, timeoutMs: number) =>
	Effect.tryPromise({
		try: async () => {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeoutMs);
			const started = performance.now();
			try {
				const response = await fetch(url, {
					method: "GET",
					redirect: "manual",
					signal: controller.signal,
					headers: { Accept: "text/html,application/json,*/*" },
				});
				return {
					ok: true as const,
					status: response.status,
					ms: Math.round(performance.now() - started),
				};
			} finally {
				clearTimeout(timer);
			}
		},
		catch: error => error,
	}).pipe(
		Effect.catch((error: unknown) =>
			Effect.succeed({
				ok: false as const,
				status: 0,
				ms: timeoutMs,
				error: error instanceof Error ? error.message : String(error),
			}),
		),
	);

type ClientStatus = {
	available: boolean;
	managementConnected: boolean;
	signalConnected: boolean;
	relaysOk: boolean;
	nameserversOk: boolean;
	peersConnected: number;
	peersTotal: number;
	proxyConnected: number;
	proxyConnecting: number;
	proxyIdle: number;
	fqdn: string;
	rawPeersCount: string;
};

// Only stdout is of interest: the callers parse it and treat a failed or
// silent `netbird` as "nothing to report" rather than an error.
const readNetbirdStdout = (args: string[]) =>
	Effect.gen(function* () {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		return yield* spawner.string(ChildProcess.make("netbird", args));
	}).pipe(Effect.orElseSucceed(() => ""));

const parseNetbirdClientStatus = () =>
	Effect.gen(function* () {
		// Summary output has "Relays: N/N Available"; detail (-d) lists per-peer
		// proxy status and does not include those summary ratios.
		const [summary, detail] = yield* Effect.all([readNetbirdStdout(["status"]), readNetbirdStdout(["status", "-d"])], {
			concurrency: 2,
		});

		const managementConnected = /Management:\s*Connected/i.test(summary);
		const signalConnected = /Signal:\s*Connected/i.test(summary);
		const relaysMatch = /Relays:\s*(\d+)\s*\/\s*(\d+)\s*Available/i.exec(summary);
		const nameserversMatch = /Nameservers:\s*(\d+)\s*\/\s*(\d+)\s*Available/i.exec(summary);
		const peersMatch = /Peers count:\s*(\d+)\s*\/\s*(\d+)\s*Connected/i.exec(summary);
		const fqdnMatch = /FQDN:\s*(\S+)/i.exec(summary);

		let proxyConnected = 0;
		let proxyConnecting = 0;
		let proxyIdle = 0;
		let inProxyBlock = false;
		for (const line of detail.split("\n")) {
			if (/^\s*proxy-[\w.-]+\.netbird\./i.test(line)) {
				inProxyBlock = true;
				continue;
			}
			if (inProxyBlock && /^\s*\S[\w.-]+\.netbird\./i.test(line)) {
				inProxyBlock = false;
			}
			if (!inProxyBlock) continue;
			if (/Status:\s*Connected\b/i.test(line)) {
				proxyConnected += 1;
				inProxyBlock = false;
			} else if (/Status:\s*Connecting\b/i.test(line)) {
				proxyConnecting += 1;
				inProxyBlock = false;
			} else if (/Status:\s*Idle\b/i.test(line)) {
				proxyIdle += 1;
				inProxyBlock = false;
			}
		}

		return {
			available: true,
			managementConnected,
			signalConnected,
			relaysOk: relaysMatch ? relaysMatch[1] === relaysMatch[2] && Number(relaysMatch[2]) > 0 : false,
			nameserversOk: nameserversMatch
				? nameserversMatch[1] === nameserversMatch[2] && Number(nameserversMatch[2]) > 0
				: false,
			peersConnected: peersMatch ? Number(peersMatch[1]) : 0,
			peersTotal: peersMatch ? Number(peersMatch[2]) : 0,
			proxyConnected,
			proxyConnecting,
			proxyIdle,
			fqdn: fqdnMatch?.[1] ?? "",
			rawPeersCount: peersMatch ? `${peersMatch[1]}/${peersMatch[2]}` : "unknown",
		} satisfies ClientStatus;
	}).pipe(
		Effect.catch(() =>
			Effect.succeed({
				available: false,
				managementConnected: false,
				signalConnected: false,
				relaysOk: false,
				nameserversOk: false,
				peersConnected: 0,
				peersTotal: 0,
				proxyConnected: 0,
				proxyConnecting: 0,
				proxyIdle: 0,
				fqdn: "",
				rawPeersCount: "n/a",
			} satisfies ClientStatus),
		),
	);

const peerMatchesHost = (peerName: string, host: string) => {
	const normalized = peerName.trim().toLowerCase();
	return normalized === host || normalized.startsWith(`${host}.`) || normalized.includes(host);
};

const httpsOkForPrivate = (probe: { ok: boolean; status: number }) =>
	probe.ok && probe.status > 0 && probe.status !== 403 && probe.status < 500;

const httpsOkForPublic = (probe: { ok: boolean; status: number }) => probe.ok && probe.status > 0 && probe.status < 500;

const testNetbirdNetwork = Command.make("test-netbird-network", {
	timeoutMs: timeoutFlag,
	domains: domainsFlag,
}).pipe(
	Command.withDescription(
		"Smoke-test the NetBird mesh: client status, inventory peers, policies/routes/DNS, proxy cluster, and HTTPS to published services",
	),
	Command.withHandler(
		Effect.fn(function* ({ timeoutMs, domains }) {
			const checks: Array<Check> = [];

			const client = yield* parseNetbirdClientStatus();
			checks.push({
				name: "client-management",
				ok: client.available && client.managementConnected,
				detail: client.available
					? `management=${client.managementConnected ? "Connected" : "down"} fqdn=${client.fqdn || "?"}`
					: "netbird CLI unavailable",
			});
			checks.push({
				name: "client-signal",
				ok: client.available && client.signalConnected,
				detail: client.available
					? `signal=${client.signalConnected ? "Connected" : "down"}`
					: "netbird CLI unavailable",
			});
			checks.push({
				name: "client-relays",
				ok: client.available && client.relaysOk,
				detail: client.available
					? client.relaysOk
						? "all relays available"
						: "one or more relays unavailable"
					: "netbird CLI unavailable",
			});
			checks.push({
				name: "client-nameservers",
				ok: client.available && client.nameserversOk,
				detail: client.available
					? client.nameserversOk
						? "all nameservers available"
						: "one or more nameservers unavailable"
					: "netbird CLI unavailable",
			});

			const [groups, policies, routes, services, peers, nameservers, clusters] = yield* Effect.all([
				groupsGet({}),
				policiesGet({}),
				routesGet({}),
				reverseProxiesServicesGet({}),
				peersGet({}),
				dnsNameserversGet({}),
				reverseProxiesClustersGet({}),
			]).pipe(Effect.provide(netbirdApi));

			const managementProbe = yield* probeHttps("https://netbird.yorganci.dev/", timeoutMs);
			checks.push({
				name: "management-https",
				ok: managementProbe.ok && managementProbe.status > 0 && managementProbe.status < 500,
				detail: managementProbe.ok
					? `HTTP ${managementProbe.status} in ${managementProbe.ms}ms`
					: `failed: ${"error" in managementProbe ? managementProbe.error : "unknown"}`,
			});

			for (const groupName of REQUIRED_GROUPS) {
				const group = groups.find(entry => entry.name === groupName);
				checks.push({
					name: `group:${groupName}`,
					ok: group !== undefined,
					detail: group === undefined ? "missing" : `id=${group.id} peers=${group.peers?.length ?? 0}`,
				});
			}

			const proxyGroup = groups.find(group => group.name === "Proxy");
			checks.push({
				name: "proxy-group-has-peers",
				ok: (proxyGroup?.peers?.length ?? 0) > 0,
				soft: true,
				detail: `peers=${proxyGroup?.peers?.length ?? 0} (add live proxy-* peers in the dashboard for durable Admin→Proxy ACL)`,
			});

			for (const host of REQUIRED_PEERS) {
				const peer = peers.find(entry => peerMatchesHost(entry.name || entry.dns_label || "", host));
				checks.push({
					name: `peer-online:${host}`,
					ok: peer?.connected === true,
					detail:
						peer === undefined
							? "peer missing from API"
							: `connected=${peer.connected} ip=${peer.ip} name=${peer.name || peer.dns_label}`,
				});
			}

			const defaultPolicy = policies.find(policy => policy.name === "Default");
			checks.push({
				name: "default-policy-disabled",
				ok: defaultPolicy?.enabled === false,
				detail: defaultPolicy === undefined ? "Default policy missing" : `enabled=${defaultPolicy.enabled}`,
			});

			for (const policyName of REQUIRED_POLICIES) {
				const policy = policies.find(entry => entry.name === policyName);
				checks.push({
					name: `policy:${policyName}`,
					ok: policy?.enabled === true,
					detail: policy === undefined ? "missing" : `enabled=${policy.enabled}`,
				});
			}

			const marsExit = routes.find(
				route => route.network_id === "mars-exit" || (route.description ?? "").includes("mars-exit"),
			);
			const marsAccessControl = marsExit?.access_control_groups ?? null;
			checks.push({
				name: "exit-route",
				ok:
					marsExit?.enabled === true &&
					marsExit.network === "0.0.0.0/0" &&
					(marsAccessControl === null || marsAccessControl.length === 0),
				detail:
					marsExit === undefined
						? "mars exit route missing"
						: `enabled=${marsExit.enabled} network=${marsExit.network} access_control_groups=${JSON.stringify(marsAccessControl)}`,
			});

			const saturnExit = routes.find(
				route => route.network_id === "saturn-exit" || (route.description ?? "").includes("saturn-exit"),
			);
			checks.push({
				name: "saturn-exit-route",
				ok: saturnExit?.enabled === true && saturnExit.network === "0.0.0.0/0" && saturnExit.skip_auto_apply === true,
				soft: true,
				detail:
					saturnExit === undefined
						? "saturn exit route missing (enroll saturn, then deploy HomeInfra)"
						: `enabled=${saturnExit.enabled} network=${saturnExit.network} skip_auto_apply=${saturnExit.skip_auto_apply} metric=${saturnExit.metric}`,
			});

			const primaries = nameservers.filter(entry => entry.primary && entry.enabled && entry.nameservers.length > 0);
			checks.push({
				name: "nameserver-primary",
				ok: primaries.length > 0,
				detail:
					primaries.length === 0
						? "no enabled primary nameserver"
						: primaries
								.map(
									entry =>
										`${entry.name} servers=[${entry.nameservers.map(server => `${server.ip}:${server.port}`).join(",")}]`,
								)
								.join("; "),
			});

			// NetBird races every primary group a peer receives and keeps the fastest
			// answer, so a second primary (e.g. a dashboard-added Cloudflare preset)
			// silently bypasses Pi-hole. Fallbacks belong inside the one group.
			const primaryConflicts = peers.flatMap(peer => {
				const peerGroupIds = new Set(peer.groups.map(group => group.id));
				const received = primaries.filter(entry => entry.groups.some(id => peerGroupIds.has(id)));
				return received.length > 1
					? [`${peer.name || peer.dns_label}: ${received.map(entry => entry.name).join(" + ")}`]
					: [];
			});
			checks.push({
				name: "nameserver-single-primary",
				ok: primaryConflicts.length === 0,
				detail:
					primaryConflicts.length === 0
						? "each peer receives at most one primary nameserver"
						: `peers with competing primaries: ${primaryConflicts.join("; ")}`,
			});

			// Only meaningful on a peer that receives the Pi-hole group, which is
			// where this script normally runs; elsewhere it is advisory.
			const blockedAddrs = yield* lookupSystem(BLOCKED_PROBE_DOMAIN);
			checks.push({
				name: `dns-blocked:${BLOCKED_PROBE_DOMAIN}`,
				ok: blockedAddrs.length > 0 && blockedAddrs.every(addr => addr === "0.0.0.0"),
				soft: !client.available,
				detail:
					blockedAddrs.length === 0
						? "lookup failed"
						: `A=[${blockedAddrs.join(", ")}] (0.0.0.0 means Pi-hole answered)`,
			});

			const onlineCluster = clusters.find(cluster => cluster.online && cluster.connected_proxies > 0);
			checks.push({
				name: "proxy-cluster-online",
				ok: onlineCluster !== undefined,
				detail:
					clusters.length === 0
						? "no proxy clusters"
						: clusters
								.map(
									cluster =>
										`${cluster.address} online=${cluster.online} connected=${cluster.connected_proxies} private=${cluster.private}`,
								)
								.join("; "),
			});

			const enabledServices = services.filter(service => service.enabled);
			const probeTargets =
				domains.length > 0
					? domains.map(domain => {
							const service = enabledServices.find(entry => entry.domain === domain);
							return {
								domain,
								private: service?.private === true,
								known: service !== undefined,
							};
						})
					: enabledServices.map(service => ({
							domain: service.domain,
							private: service.private === true,
							known: true,
						}));

			checks.push({
				name: "services-enabled-count",
				ok: enabledServices.length > 0,
				detail: `enabled=${enabledServices.length} total=${services.length}`,
			});

			for (const target of probeTargets) {
				if (!target.known) {
					checks.push({
						name: `service:${target.domain}`,
						ok: false,
						detail: "domain not found among enabled reverse-proxy services",
					});
					continue;
				}

				const addrs = (yield* lookupSystem(target.domain)).filter(isIPv4);
				if (target.private) {
					const meshAddrs = addrs.filter(isMeshIpv4);
					checks.push({
						name: `dns-mesh:${target.domain}`,
						ok: meshAddrs.length > 0,
						detail: addrs.length === 0 ? "no A records" : `A=[${addrs.join(", ")}]`,
					});
				} else {
					checks.push({
						name: `dns:${target.domain}`,
						ok: addrs.length > 0,
						detail: addrs.length === 0 ? "no A records" : `A=[${addrs.join(", ")}]`,
					});
				}

				const probe = yield* probeHttps(`https://${target.domain}/`, timeoutMs);
				const httpOk = target.private ? httpsOkForPrivate(probe) : httpsOkForPublic(probe);
				checks.push({
					name: `https:${target.domain}`,
					ok: httpOk,
					detail: probe.ok
						? `HTTP ${probe.status} in ${probe.ms}ms private=${target.private}`
						: `failed: ${"error" in probe ? probe.error : "unknown"}`,
				});
			}

			// Mesh DNS for the management peer itself.
			const marsDns = (yield* lookupSystem("mars.netbird.selfhosted")).filter(isIPv4);
			checks.push({
				name: "dns-mesh:mars.netbird.selfhosted",
				ok: marsDns.some(isMeshIpv4),
				detail: marsDns.length === 0 ? "no A records" : `A=[${marsDns.join(", ")}]`,
			});

			checks.push({
				name: "client-proxy-peer",
				ok: client.available && client.proxyConnected > 0,
				soft: true,
				detail: client.available
					? `proxy Connected=${client.proxyConnected} Connecting=${client.proxyConnecting} Idle=${client.proxyIdle}; peers ${client.rawPeersCount}`
					: "netbird CLI unavailable",
			});

			let failed = 0;
			let warned = 0;
			for (const check of checks) {
				const mark = check.ok ? "PASS" : check.soft ? "WARN" : "FAIL";
				if (!check.ok && check.soft) warned += 1;
				if (!check.ok && !check.soft) failed += 1;
				yield* Console.log(`${mark}\t${check.name}\t${check.detail}`);
			}
			yield* Console.log(
				`SUMMARY\t${checks.length - failed - warned}/${checks.length} passed` +
					(warned > 0 ? `, ${warned} warning(s)` : "") +
					(failed > 0 ? `, ${failed} failed` : ""),
			);
			if (failed > 0) {
				return yield* Effect.fail(new Error(`${failed} NetBird network check(s) failed — see FAIL lines above`));
			}
		}),
	),
);

const program = Command.run(testNetbirdNetwork, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
);

NodeRuntime.runMain(program as Effect.Effect<void>);
