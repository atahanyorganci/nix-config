import { BunRuntime } from "@effect/platform-bun";
import * as BunServices from "@effect/platform-bun/BunServices";
import { CredentialsFromConfig } from "@yorganci/netbird-api/Credentials";
import { dnsNameserversGet } from "@yorganci/netbird-api/dns";
import { groupsGet } from "@yorganci/netbird-api/groups";
import { peersGet } from "@yorganci/netbird-api/peers";
import { policiesGet } from "@yorganci/netbird-api/policies";
import { routesGet } from "@yorganci/netbird-api/routes";
import { reverseProxiesClustersGet, reverseProxiesServicesGet } from "@yorganci/netbird-api/services";
import { AlchemyContextLive } from "alchemy/AlchemyContext";
import { ArtifactStore, createArtifactStore } from "alchemy/Artifacts";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { withProfileOverride } from "alchemy/Auth/Profile";
import { Stage } from "alchemy/Stage";
import * as State from "alchemy/State";
import { loadConfigProvider } from "alchemy/Util/ConfigProvider";
import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Option from "effect/Option";
import * as Command from "effect/unstable/cli/Command";
import * as Flag from "effect/unstable/cli/Flag";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { promises as dns } from "node:dns";
import { isIPv4 } from "node:net";
import { readNetbirdCredentials } from "../src/netbird-credentials.ts";
import netbirdServerStack from "../stack/netbird-server.ts";

/** Inventory hosts that should normally be online on the mesh. */
const REQUIRED_PEERS = ["mars", "mercury", "venus", "jupiter"] as const;

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

const USER = Config.string("USER").pipe(
	Config.orElse(() => Config.string("USERNAME")),
	Config.withDefault("unknown"),
);

const defaultStage = USER.pipe(
	Effect.flatMap(user => Config.string("stage").pipe(Config.withDefault(`dev_${user}`))),
	Effect.orDie,
);

const stageFlag = Flag.string("stage").pipe(
	Flag.withDescription("Alchemy stage for the NetbirdServer stack (defaults to dev_${USER})"),
	Flag.optional,
	Flag.mapEffect(
		Effect.fn(function* (stage) {
			if (Option.isSome(stage)) {
				return stage.value;
			}
			return yield* defaultStage;
		}),
	),
);

const profileFlag = Flag.string("profile").pipe(
	Flag.withDescription("Alchemy auth profile (defaults to $ALCHEMY_PROFILE or 'default')"),
	Flag.optional,
	Flag.mapEffect(
		Effect.fn(function* (profile) {
			if (Option.isSome(profile)) {
				return profile.value;
			}
			return yield* Config.string("ALCHEMY_PROFILE").pipe(Config.withDefault("default"), Effect.orDie);
		}),
	),
);

const envFileFlag = Flag.file("env-file").pipe(
	Flag.optional,
	Flag.withDescription("Environment file to load (defaults to .env when present)"),
);

const timeoutFlag = Flag.integer("timeout-ms").pipe(
	Flag.withDescription("Per-domain HTTPS probe timeout in milliseconds"),
	Flag.optional,
	Flag.mapEffect(
		Effect.fn(function* (timeout) {
			if (Option.isSome(timeout)) {
				return timeout.value;
			}
			return 12_000;
		}),
	),
);

const domainsFlag = Flag.string("domain").pipe(
	Flag.withDescription(
		"Comma-separated domains to probe (defaults to every enabled reverse-proxy service from the API)",
	),
	Flag.optional,
	Flag.mapEffect(
		Effect.fn(function* (domain) {
			if (Option.isNone(domain) || domain.value.trim() === "") {
				return [] as Array<string>;
			}
			return domain.value
				.split(",")
				.map(entry => entry.trim())
				.filter(Boolean);
		}),
	),
);

const readNetbirdCredentialsFromState = (state: State.StateService, stage: string) =>
	readNetbirdCredentials(stage).pipe(Effect.provide(Layer.succeed(State.State, Effect.succeed(state))));

const withAlchemyState = <A, E>(
	options: {
		stage: string;
		profile: string;
		envFile: Option.Option<string>;
	},
	body: (state: State.StateService) => Effect.Effect<A, E>,
) =>
	Effect.gen(function* () {
		if (!Effect.isEffect(netbirdServerStack)) {
			return yield* Effect.die("stack/netbird-server.ts must default-export an Alchemy stack effect");
		}

		const services = Layer.mergeAll(
			AlchemyContextLive,
			Layer.succeed(ArtifactStore, createArtifactStore()),
			Layer.succeed(AuthProviders, {}),
			ConfigProvider.layer(withProfileOverride(yield* loadConfigProvider(options.envFile), options.profile)),
			Logger.layer([], { mergeWithExisting: true }),
			Layer.succeed(Stage, options.stage),
			FetchHttpClient.layer,
		);

		return yield* Effect.gen(function* () {
			const stack = yield* netbirdServerStack;
			return yield* Effect.gen(function* () {
				const state = yield* yield* State.State;
				return yield* body(state);
			}).pipe(Effect.provide(stack.services));
		}).pipe(Effect.provide(services), Effect.scoped);
	});

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

const resolveA = (domain: string) =>
	Effect.tryPromise({
		try: () => dns.resolve4(domain),
		catch: error => error,
	}).pipe(Effect.orElseSucceed(() => [] as Array<string>));

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

const readNetbirdStdout = async (args: string[]) => {
	const proc = Bun.spawn(["netbird", ...args], { stdout: "pipe", stderr: "pipe" });
	const stdout = await new Response(proc.stdout).text();
	await proc.exited;
	return stdout;
};

const parseNetbirdClientStatus = (): Effect.Effect<ClientStatus> =>
	Effect.tryPromise({
		try: async () => {
			// Summary output has "Relays: N/N Available"; detail (-d) lists per-peer
			// proxy status and does not include those summary ratios.
			const [summary, detail] = await Promise.all([
				readNetbirdStdout(["status"]),
				readNetbirdStdout(["status", "-d"]),
			]);

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
		},
		catch: error => error,
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
	stage: stageFlag,
	profile: profileFlag,
	envFile: envFileFlag,
	timeoutMs: timeoutFlag,
	domains: domainsFlag,
}).pipe(
	Command.withDescription(
		"Smoke-test the NetBird mesh: client status, inventory peers, policies/routes/DNS, proxy cluster, and HTTPS to published services",
	),
	Command.withHandler(
		Effect.fn(function* ({ stage, profile, envFile, timeoutMs, domains }) {
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
				detail: client.available ? `signal=${client.signalConnected ? "Connected" : "down"}` : "netbird CLI unavailable",
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

			yield* withAlchemyState({ stage, profile, envFile }, state =>
				Effect.gen(function* () {
					const credentials = yield* readNetbirdCredentialsFromState(state, stage);
					const netbirdApi = Layer.mergeAll(CredentialsFromConfig(credentials), FetchHttpClient.layer);
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
						detail:
							defaultPolicy === undefined ? "Default policy missing" : `enabled=${defaultPolicy.enabled}`,
					});

					for (const policyName of REQUIRED_POLICIES) {
						const policy = policies.find(entry => entry.name === policyName);
						checks.push({
							name: `policy:${policyName}`,
							ok: policy?.enabled === true,
							detail: policy === undefined ? "missing" : `enabled=${policy.enabled}`,
						});
					}

					const exitRoute = routes.find(
						route => route.network === "0.0.0.0/0" || (route.description ?? "").includes("mars-exit"),
					);
					const accessControl = exitRoute?.access_control_groups ?? null;
					checks.push({
						name: "exit-route",
						ok:
							exitRoute?.enabled === true &&
							exitRoute.network === "0.0.0.0/0" &&
							(accessControl === null || accessControl.length === 0),
						detail:
							exitRoute === undefined
								? "mars exit route missing"
								: `enabled=${exitRoute.enabled} network=${exitRoute.network} access_control_groups=${JSON.stringify(accessControl)}`,
					});

					const primaryNs = nameservers.find(entry => entry.primary && entry.enabled);
					checks.push({
						name: "nameserver-primary",
						ok: primaryNs !== undefined,
						detail:
							primaryNs === undefined
								? "no enabled primary nameserver"
								: `${primaryNs.name} servers=[${primaryNs.nameservers.map(entry => `${entry.ip}:${entry.port}`).join(",")}]`,
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

						const addrs = (yield* resolveA(target.domain)).filter(isIPv4);
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
					const marsDns = (yield* resolveA("mars.netbird.selfhosted")).filter(isIPv4);
					checks.push({
						name: "dns-mesh:mars.netbird.selfhosted",
						ok: marsDns.some(isMeshIpv4),
						detail: marsDns.length === 0 ? "no A records" : `A=[${marsDns.join(", ")}]`,
					});
				}),
			);

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
	Effect.provide(BunServices.layer),
	Effect.scoped,
	Effect.orDie,
);

BunRuntime.runMain(program as Effect.Effect<void>);
