import * as NetBird from "@yorganci/netbird-alchemy";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

const DOMAIN = "yorganci.dev";
const NETBIRD_IP = "91.99.103.93";

/** Stable NetBird peer IDs (management store). */
const PEER_MERCURY = "d9bc4hn0vp6n2qgqba4g";
const PEER_VENUS = "d99ve6f0vp6kefutb2v0";
const PEER_MARS = "d9aba6f0vp6m1cjc8gg0";

/** Built-in "All" group ID. */
const GROUP_ALL = "d99tk9n0vp6k4geo50pg";

/** Reverse-proxy cluster address (`NB_PROXY_DOMAIN`). */
const PROXY_CLUSTER = "yorganci.dev";

const oidcAuth = {
	bearerAuth: { enabled: true },
} as const;

const peerHttpTarget = (peerId: string, port: number) => [
	{
		targetId: peerId,
		targetType: "peer" as const,
		protocol: "http" as const,
		port,
		enabled: true,
	},
];

export default Alchemy.Stack(
	"Infra",
	{
		providers: Layer.mergeAll(Cloudflare.providers(), NetBird.providers()),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const zone = yield* Cloudflare.Zone.Zone("Domain", {
			name: DOMAIN,
		});
		const netbirdRecord = yield* Cloudflare.DNS.Record("NetbirdDnsRecord", {
			zoneId: zone.zoneId,
			name: `netbird.${DOMAIN}`,
			type: "A",
			content: NETBIRD_IP,
			proxied: false,
			ttl: "1",
		});
		yield* Cloudflare.DNS.Record("ProxyWildcardDnsRecord", {
			zoneId: zone.zoneId,
			name: `*.${DOMAIN}`,
			type: "A",
			content: NETBIRD_IP,
			proxied: false,
			ttl: "1",
		});

		const infraPeers = yield* NetBird.Group("InfraPeers", {
			name: "infra-peers",
		});

		const mercury = yield* NetBird.Peer("Mercury", { peerId: PEER_MERCURY });
		const venus = yield* NetBird.Peer("Venus", { peerId: PEER_VENUS });
		const mars = yield* NetBird.Peer("Mars", { peerId: PEER_MARS });

		const proxyDomain = yield* NetBird.ReverseProxyDomain("ProxyApex", {
			domain: DOMAIN,
			targetCluster: PROXY_CLUSTER,
		});

		// Jellyfin — public, app-native NetBird OIDC (no proxy auth)
		const watch = yield* NetBird.ReverseProxyService("Watch", {
			name: "watch",
			domain: `watch.${DOMAIN}`,
			enabled: true,
			private: false,
			targets: peerHttpTarget(PEER_VENUS, 8096),
		});

		// Calibre — public + NetBird OIDC at the proxy
		const library = yield* NetBird.ReverseProxyService("Library", {
			name: "library",
			domain: `library.${DOMAIN}`,
			enabled: true,
			private: false,
			auth: oidcAuth,
			targets: peerHttpTarget(PEER_VENUS, 8083),
		});

		// Arr / Transmission / HA / Pi-hole / oMLX — mesh-private
		const film = yield* NetBird.ReverseProxyService("Film", {
			name: "film",
			domain: `film.${DOMAIN}`,
			enabled: true,
			private: true,
			accessGroups: [GROUP_ALL],
			targets: peerHttpTarget(PEER_VENUS, 7878),
		});
		const tv = yield* NetBird.ReverseProxyService("Tv", {
			name: "tv",
			domain: `tv.${DOMAIN}`,
			enabled: true,
			private: true,
			accessGroups: [GROUP_ALL],
			targets: peerHttpTarget(PEER_VENUS, 8989),
		});
		const indexer = yield* NetBird.ReverseProxyService("Indexer", {
			name: "indexer",
			domain: `indexer.${DOMAIN}`,
			enabled: true,
			private: true,
			accessGroups: [GROUP_ALL],
			targets: peerHttpTarget(PEER_VENUS, 9696),
		});
		const download = yield* NetBird.ReverseProxyService("Download", {
			name: "download",
			domain: `download.${DOMAIN}`,
			enabled: true,
			private: true,
			accessGroups: [GROUP_ALL],
			targets: peerHttpTarget(PEER_VENUS, 9091),
		});
		const homeAssistant = yield* NetBird.ReverseProxyService("HomeAssistant", {
			name: "home-assistant",
			domain: `home-assistant.${DOMAIN}`,
			enabled: true,
			private: true,
			accessGroups: [GROUP_ALL],
			targets: peerHttpTarget(PEER_MERCURY, 8123),
		});
		const pihole = yield* NetBird.ReverseProxyService("Pihole", {
			name: "pihole",
			domain: `pihole.${DOMAIN}`,
			enabled: true,
			private: true,
			accessGroups: [GROUP_ALL],
			targets: peerHttpTarget(PEER_MARS, 8053),
		});
		const omlx = yield* NetBird.ReverseProxyService("Omlx", {
			name: "omlx",
			domain: `omlx.${DOMAIN}`,
			enabled: true,
			private: true,
			accessGroups: [GROUP_ALL],
			targets: peerHttpTarget(PEER_VENUS, 8000),
		});

		return {
			zoneId: zone.zoneId,
			netbirdUrl: Output.interpolate`https://${netbirdRecord.content}`,
			infraPeersGroupId: infraPeers.groupId,
			proxyDomainId: proxyDomain.domainId,
			peers: {
				mercury: mercury.peerId,
				venus: venus.peerId,
				mars: mars.peerId,
			},
			services: {
				download: download.serviceId,
				watch: watch.serviceId,
				library: library.serviceId,
				film: film.serviceId,
				tv: tv.serviceId,
				indexer: indexer.serviceId,
				homeAssistant: homeAssistant.serviceId,
				pihole: pihole.serviceId,
				omlx: omlx.serviceId,
			},
		};
	}),
);
