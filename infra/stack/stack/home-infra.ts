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
import { ReverseProxy, HomeInfra, NixExpr, type HomeInfraPeerOutput } from "../src/index.ts";
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

		const httpServicesExpr = yield* NixExpr.NixExpr("HttpServices", {
			cwd: REPO_ROOT,
			expression: ".#httpServices",
		});
		const httpServices = yield* NixExpr.decode(httpServicesExpr, ReverseProxy.HttpServices);

		if (Object.keys(httpServices).length === 0) {
			return yield* Effect.die("flake.httpServices is empty — enable httpServices.expose in host modules first");
		}

		const hostKeys = Object.keys(httpServices);

		const groups = yield* groupsGet({}).pipe(Effect.orDie);
		const allGroup = groups.find(group => group.name === "All");
		if (!allGroup) {
			return yield* Effect.die("NetBird All group not found");
		}

		const plans = yield* Schema.decodeEffect(ReverseProxy.ServicePlansFromHttpServices)({
			httpServices,
			domain: infra.domain,
		});

		if (plans.length === 0) {
			return yield* Effect.die("no httpServices entries have expose.enable — nothing to publish");
		}

		const clusters = yield* reverseProxiesClustersGet({}).pipe(Effect.orDie);
		const targetCluster = clusters.find(entry => entry.online)?.address ?? clusters[0]?.address ?? infra.domain;

		yield* NetBird.ReverseProxyDomain("YorganciDev", {
			domain: infra.domain,
			targetCluster,
		});

		const peers: Record<string, NetBird.Peer> = {};
		const peerOutputs: Record<string, HomeInfraPeerOutput> = {};
		for (const hostKey of hostKeys) {
			const peer = yield* NetBird.Peer(peerLogicalId(hostKey), {
				host: hostKey,
			});
			peers[hostKey] = peer;
			peerOutputs[hostKey] = {
				hostname: peer.hostname,
				peerId: peer.peerId,
			};
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

		return {
			peers: peerOutputs,
			services,
		};
	}).pipe(Effect.orDie),
);
