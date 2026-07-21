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
import * as Schema from "effect/Schema";
import { NetbirdServer, NetbirdServerStack, NixExpr } from "../src/index.ts";

const DOMAIN = "yorganci.dev";
const NETBIRD_HOST = `netbird-4.${DOMAIN}`;

const FlakeMe = Schema.Struct({
	name: Schema.String,
	email: Schema.String,
	username: Schema.String,
	shell: Schema.String,
	key: Schema.String,
	authorizedKeys: Schema.Array(Schema.String),
});

/**
 * Paths assume Alchemy is launched from `infra/stack` (package scripts).
 * Nix eval uses the repository root as `cwd`.
 */
const REPO_ROOT = "../..";

// Actions hydrate the PAT during the first deploy. Subsequent deploys and
// destroys still need the current management endpoint before that action runs.
const netbirdCredentials = Ref.makeUnsafe<Record<string, string>>({
	NETBIRD_API_BASE_URL: `https://${NETBIRD_HOST}`,
});

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

const preferProvisionedApiToken = (
	provisioned: Redacted.Redacted<string>,
	fallback: Redacted.Redacted<string>,
): Redacted.Redacted<string> => (Redacted.value(provisioned).length > 0 ? provisioned : fallback);

export default NetbirdServerStack.make(
	{
		providers: Layer.mergeAll(
			Cloudflare.providers(),
			Hetzner.providers(),
			NetBird.providers(NetBird.CredentialsFromRef(netbirdCredentials)),
			NixExpr.NixExprProvider(),
		),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const meExpr = yield* NixExpr.NixExpr("FlakeMe", {
			cwd: REPO_ROOT,
			expression: ".#me",
		});
		const me = yield* NixExpr.decode(meExpr, FlakeMe);

		const deployKey = me.authorizedKeys[0];
		if (!deployKey) {
			return yield* Effect.die("flake.me.authorizedKeys is empty");
		}

		const sshKey = yield* Hetzner.SshKey("DeployKey", {
			name: me.username,
			publicKey: deployKey,
		});
		const {
			ipv4: { ip: serverIp },
			server,
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
			name: NETBIRD_HOST,
			type: "A",
			content: serverIp,
			proxied: false,
			ttl: "1",
		});
		const netbirdApiBaseUrl = Output.map(netbirdRecord.content, () => `https://${NETBIRD_HOST}`);
		yield* Cloudflare.DNS.Record("ProxyWildcardDnsRecord", {
			zoneId: zone.zoneId,
			name: `*.${DOMAIN}`,
			type: "A",
			content: serverIp,
			proxied: false,
			ttl: "1",
		});

		const serverNixos = yield* Command.Exec("ServerNixos", {
			command: Output.interpolate`nix run .#deploy-nixos -- ${serverIp} ${server.serverId} . mars ${NETBIRD_HOST}`,
			cwd: REPO_ROOT,
			memo: {
				include: [
					"**/*.nix",
					"flake.lock",
					"modules/pkgs/deploy-nixos/default.nix",
					"modules/pkgs/deploy-nixos/deploy-nixos.sh",
				],
			},
		});

		const adminPassword = yield* Alchemy.Random("NetBirdAdminPassword", {
			bytes: 24,
		});

		const setup = yield* NetBird.Setup("Admin", {
			apiBaseUrl: netbirdApiBaseUrl,
			email: me.email,
			name: me.name,
			password: adminPassword.text,
			patExpireIn: 365,
			// Wait for NixOS install/rebuild before hitting the management API.
			ready: Output.map(serverNixos.hash, hash => hash.input ?? "pending"),
		});

		// Bootstrap credentials so NetBird API resources can authenticate.
		yield* UpdateNetBirdCredentialsRef({
			apiBaseUrl: setup.apiBaseUrl,
			apiToken: setup.personalAccessToken,
		});

		const adminApiKey = yield* NetBird.ApiKey("AdminApiKey", {
			userId: setup.userId,
			name: "admin-full-access",
			expiresIn: 365,
		}).pipe(Alchemy.RemovalPolicy.retain());

		yield* UpdateNetBirdCredentialsRef({
			apiBaseUrl: setup.apiBaseUrl,
			apiToken: Output.map(Output.all(adminApiKey.token, setup.personalAccessToken), ([provisioned, fallback]) =>
				preferProvisionedApiToken(provisioned, fallback),
			),
		});

		return {
			zone: zone.name,
			serverIp,
			apiBaseUrl: netbirdApiBaseUrl,
			admin: {
				email: setup.email,
				password: setup.password,
			},
		};
	}),
);
