import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";

const DOMAIN = "yorganci.dev";
const NETBIRD_IP = "91.99.103.93";

export default Alchemy.Stack(
	"Infra",
	{
		providers: Cloudflare.providers(),
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
		return {
			zoneId: zone.zoneId,
			netbirdUrl: Output.interpolate`https://${netbirdRecord.content}`,
		};
	}),
);
