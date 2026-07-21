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
import { NetbirdServer } from "./src/index.ts";

const DOMAIN = "yorganci.dev";
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
		const {
			ipv4: { ip: marsIp },
			server: marsServer,
		} = yield* NetbirdServer.stack({
			name: "mars",
			location: "nbg1",
			image: "ubuntu-24.04",
			serverType: "cx23",
			sshKey: sshKey.name,
		});

		const zone = yield* Cloudflare.Zone.Zone("Domain", {
			name: DOMAIN,
		});
		const netbirdRecord = yield* Cloudflare.DNS.Record("NetbirdDnsRecord", {
			zoneId: zone.zoneId,
			name: `netbird.${DOMAIN}`,
			type: "A",
			content: marsIp,
			proxied: false,
			ttl: "1",
		});
		const netbirdApiBaseUrl = Output.interpolate`https://${netbirdRecord.content}`;
		yield* Cloudflare.DNS.Record("ProxyWildcardDnsRecord", {
			zoneId: zone.zoneId,
			name: `*.${DOMAIN}`,
			type: "A",
			content: marsIp,
			proxied: false,
			ttl: "1",
		});

		const marsNixos = yield* Command.Exec("MarsNixos", {
			command: Output.interpolate`${DEPLOY_SCRIPT} ${marsIp} ${marsServer.serverId} ${netbirdRecord.content}`,
			cwd: REPO_ROOT,
			memo: {
				include: ["**/*.nix", "flake.lock", "infra/stack/scripts/deploy-mars-nixos.sh"],
			},
		});

		const adminPassword = yield* Alchemy.Random("NetBirdAdminPassword", {
			bytes: 24,
		});

		const setup = yield* NetBird.Setup("Admin", {
			apiBaseUrl: netbirdApiBaseUrl,
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

		yield* NetBird.SetupKey("InfraSetupKey", {
			name: "infra-peers-bootstrap",
			type: "reusable",
			expiresIn: 31_536_000,
			usageLimit: 0,
			autoGroups: [infraPeers.groupId],
		});

		return {
			zone: zone.name,
			marsIp,
			apiBaseUrl: netbirdApiBaseUrl,
			admin: {
				email: setup.email,
				password: setup.password,
			},
		};
	}),
);
