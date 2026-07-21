import * as Hetzner from "@yorganci/hetzner-alchemy";
import * as NetBird from "@yorganci/netbird-alchemy";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Command from "alchemy/Command";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";

const DOMAIN = "yorganci.dev";
const LOCATION = "nbg1";
const SERVER_TYPE = "cx23";
const IMAGE = "ubuntu-24.04";
const NETBIRD_URL = `https://netbird.${DOMAIN}`;
const ADMIN_EMAIL = "atahanyorganci@hotmail.com";
const ADMIN_NAME = "Atahan";

/** Deploy key also present in flake.me.authorizedKeys / Hetzner as "Atahan". */
const DEPLOY_SSH_PUBLIC_KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOjQEQWwP1aWkv4t/nzin3rRn7ueC7HWR+g9Tec1nwuS";

/**
 * Paths assume Alchemy is launched from `infra/stack` (package scripts).
 * Exec uses the repository root as `cwd` so memo can hash every Nix source.
 */
const REPO_ROOT = "../..";
const DEPLOY_SCRIPT = "infra/stack/scripts/deploy-mars-nixos.sh";

const netbirdCredentials = Ref.makeUnsafe<Record<string, string>>({});

const UpdateNetBirdCredentialsRef = Alchemy.Action(
	"UpdateNetBirdCredentialsRef",
	Effect.succeed(
		Effect.fn(function* (input: NetBird.CredentialsConfig) {
			const apiToken = Redacted.value(input.apiToken);
			if (!apiToken) {
				return yield* Effect.die("NetBird PAT is empty after Setup");
			}

			yield* Ref.set(netbirdCredentials, {
				NETBIRD_API_TOKEN: apiToken,
				NETBIRD_API_BASE_URL: input.apiBaseUrl,
			});

			return {
				apiToken,
				apiBaseUrl: input.apiBaseUrl,
			};
		}),
	),
);

export default Alchemy.Stack(
	"Infra",
	{
		providers: Layer.mergeAll(
			Cloudflare.providers(),
			Hetzner.providers(),
			NetBird.providers(NetBird.CredentialsFromRef(netbirdCredentials)),
		),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const sshKey = yield* Hetzner.SshKey("DeployKey", {
			name: "Atahan",
			publicKey: DEPLOY_SSH_PUBLIC_KEY,
		});

		const firewall = yield* Hetzner.Firewall("MarsFirewall", {
			name: "mars",
			rules: [
				{
					direction: "in",
					protocol: "tcp",
					port: "22",
					sourceIps: ["0.0.0.0/0", "::/0"],
					description: "SSH",
				},
				{
					direction: "in",
					protocol: "tcp",
					port: "80",
					sourceIps: ["0.0.0.0/0", "::/0"],
					description: "HTTP ACME",
				},
				{
					direction: "in",
					protocol: "tcp",
					port: "443",
					sourceIps: ["0.0.0.0/0", "::/0"],
					description: "HTTPS",
				},
				{
					direction: "in",
					protocol: "udp",
					port: "3478",
					sourceIps: ["0.0.0.0/0", "::/0"],
					description: "NetBird STUN",
				},
				{
					direction: "in",
					protocol: "udp",
					port: "51820",
					sourceIps: ["0.0.0.0/0", "::/0"],
					description: "WireGuard",
				},
			],
		});

		const marsIp = yield* Hetzner.PrimaryIp("MarsIpv4", {
			name: "mars-ipv4",
			type: "ipv4",
			location: LOCATION,
			autoDelete: false,
		});

		const marsServer = yield* Hetzner.Server("Mars", {
			name: "mars",
			serverType: SERVER_TYPE,
			image: IMAGE,
			location: LOCATION,
			sshKeys: [sshKey.name],
			firewalls: [firewall.firewallId],
			primaryIpv4Id: marsIp.primaryIpId,
			enableIpv6: false,
		});

		const zone = yield* Cloudflare.Zone.Zone("Domain", {
			name: DOMAIN,
		});
		const netbirdRecord = yield* Cloudflare.DNS.Record("NetbirdDnsRecord", {
			zoneId: zone.zoneId,
			name: `netbird.${DOMAIN}`,
			type: "A",
			content: marsIp.ip,
			proxied: false,
			ttl: "1",
		});
		yield* Cloudflare.DNS.Record("ProxyWildcardDnsRecord", {
			zoneId: zone.zoneId,
			name: `*.${DOMAIN}`,
			type: "A",
			content: marsIp.ip,
			proxied: false,
			ttl: "1",
		});

		const marsNixos = yield* Command.Exec("MarsNixos", {
			command: Output.interpolate`${DEPLOY_SCRIPT} ${marsIp.ip} ${marsServer.serverId} ${netbirdRecord.content}`,
			cwd: REPO_ROOT,
			memo: {
				include: ["**/*.nix", "flake.lock", "infra/stack/scripts/deploy-mars-nixos.sh"],
			},
		});

		const adminPassword = yield* Alchemy.Random("NetBirdAdminPassword", {
			bytes: 24,
		});

		const setup = yield* NetBird.Setup("Admin", {
			apiBaseUrl: NETBIRD_URL,
			email: ADMIN_EMAIL,
			name: ADMIN_NAME,
			password: adminPassword.text,
			patExpireIn: 365,
			// Wait for NixOS install/rebuild before hitting the management API.
			ready: Output.map(marsNixos.hash, hash => hash.input ?? "pending"),
		});

		const credentials = yield* UpdateNetBirdCredentialsRef({
			apiBaseUrl: setup.apiBaseUrl,
			apiToken: setup.personalAccessToken,
		});

		const infraPeers = yield* NetBird.Group("InfraPeers", {
			name: "infra-peers",
			// Depend on credential hydration so API calls see NETBIRD_API_TOKEN.
			peers: Output.map(credentials, () => [] as string[]),
		});

		const infraSetupKey = yield* NetBird.SetupKey("InfraSetupKey", {
			name: "infra-peers-bootstrap",
			type: "reusable",
			expiresIn: 31_536_000,
			usageLimit: 0,
			autoGroups: [infraPeers.groupId],
		});

		return {
			zoneId: zone.zoneId,
			mars: {
				serverId: marsServer.serverId,
				ipv4: marsIp.ip,
				primaryIpId: marsIp.primaryIpId,
				firewallId: firewall.firewallId,
			},
			netbirdUrl: Output.interpolate`${NETBIRD_URL}`,
			adminEmail: ADMIN_EMAIL,
			infraPeersGroupId: infraPeers.groupId,
			infraSetupKeyId: infraSetupKey.keyId,
			dns: {
				netbird: netbirdRecord.content,
			},
		};
	}),
);
