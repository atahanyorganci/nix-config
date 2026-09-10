import * as NetBird from "@yorganci/netbird-alchemy";
import * as Alchemy from "alchemy";
import * as Action from "alchemy/Action";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Command from "alchemy/Command";
import * as Output from "alchemy/Output";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import { Aws, Hetzner, NetbirdServer, NetbirdServerStack, NixExpr } from "../src/index.ts";

const FlakeMe = Schema.Struct({
	name: Schema.String,
	email: Schema.String,
	username: Schema.String,
	shell: Schema.String,
	key: Schema.String,
	authorizedKeys: Schema.Array(Schema.String),
});

const meExpr = Effect.gen(function* () {
	const meExpr = yield* NixExpr.NixExpr("FlakeMe", {
		cwd: REPO_ROOT,
		expression: ".#me",
	});
	const me = yield* NixExpr.decode(meExpr, FlakeMe);
	return me;
});

const Infra = Schema.Struct({
	domain: Schema.String,
	netbirdManagementDomain: Schema.String,
});

const infraExpr = Effect.gen(function* () {
	const infraExpr = yield* NixExpr.NixExpr("Infra", {
		cwd: REPO_ROOT,
		expression: ".#infra",
	});
	const infra = yield* NixExpr.decode(infraExpr, Infra);
	return infra;
});

/**
 * Paths assume Alchemy is launched from `infra/stack` (package scripts).
 * Nix eval uses the repository root as `cwd`.
 */
const REPO_ROOT = "../..";

// Actions hydrate the PAT during the first deploy. Subsequent deploys and
// destroys still need the current management endpoint before that action runs.
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

const AdminPassword = Action.Action(
	"AdminPassword",
	Effect.fn(function* ({ length }: { length: number }) {
		const crypto = yield* Crypto.Crypto;
		const bytes = yield* crypto.randomBytes(length);
		const hex = Array.from(bytes)
			.map(byte => byte.toString(16))
			.join("");
		const password = Redacted.make(`Nb${hex}!`);
		return password;
	}),
);

// A NixOS deploy re-runs whenever the flake or a host configuration changes.
const NIX_MEMO = {
	include: ["flake.nix", "flake.lock", "modules/**/*", "hosts/**/*"],
};

// Bootstrapping installs NixOS once per server, so its memo tracks no
// repository content: configuration changes must not re-run it. A server
// replacement changes the command (new host) and runs it again.
const BOOTSTRAP_MEMO = { include: [] as string[] };

const preferProvisionedApiToken = (
	provisioned: Redacted.Redacted<string>,
	fallback: Redacted.Redacted<string>,
): Redacted.Redacted<string> => (Redacted.value(provisioned).length > 0 ? provisioned : fallback);

export default NetbirdServerStack.make(
	{
		providers: Layer.mergeAll(
			Cloudflare.providers(),
			Hetzner.providers(),
			Aws.providers(),
			NetBird.providers(NetBird.CredentialsFromRef(netbirdCredentials)),
			NixExpr.NixExprProvider(),
		),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const [me, infra] = yield* Effect.all([meExpr, infraExpr]);

		yield* Ref.set(netbirdCredentials, {
			NETBIRD_API_BASE_URL: `https://${infra.netbirdManagementDomain}`,
		});

		const deployKey = me.authorizedKeys[0];
		if (!deployKey) {
			return yield* Effect.die("flake.me.authorizedKeys is empty");
		}

		const sshKey = yield* Hetzner.SshKey("DeployKey", {
			name: me.username,
			publicKey: deployKey,
		});
		const {
			ipv4: { ip: marsIp },
			server: marsServer,
		} = yield* NetbirdServer.stack({
			name: "mars",
			location: "nbg1",
			image: "ubuntu-24.04",
			serverType: "cx23",
			sshKey,
		});
		const marsBootstrap = yield* Command.Exec("MarsNixosBootstrap", {
			command: Output.map(
				Output.all(marsServer.serverId, marsIp),
				([, host]) => `nix run .#nixos-bootstrap -- root@${host} .#pluto`,
			),
			cwd: REPO_ROOT,
			memo: BOOTSTRAP_MEMO,
		});
		const marsNixos = yield* Command.Exec("MarsNixos", {
			command: Output.map(
				Output.all(marsBootstrap.hash, marsIp),
				([, host]) => `nix run .#nixos-deploy -- atahan@${host} .#mars`,
			),
			cwd: REPO_ROOT,
			memo: NIX_MEMO,
		});

		const jupiterIpv4 = yield* Hetzner.PrimaryIp("JupiterIpv4", {
			name: "jupiter-ipv4",
			type: "ipv4",
			location: "nbg1",
			autoDelete: false,
		});
		const jupiter = yield* Hetzner.Server("JupiterServer", {
			name: "jupiter",
			serverType: "cx33",
			image: "ubuntu-24.04",
			location: "nbg1",
			sshKeys: [sshKey],
			enableIpv6: false,
		});
		yield* Hetzner.Firewall("JupiterFirewall", {
			name: "jupiter",
			rules: [
				{
					direction: "in",
					protocol: "tcp",
					port: "22",
					sourceIps: ["0.0.0.0/0", "::/0"],
					description: "SSH",
				},
			],
			applyTo: [jupiter],
		});
		const jupiterNixosBootstrap = yield* Command.Exec("JupiterNixosBootstrap", {
			command: Output.map(
				Output.all(jupiter.serverId, jupiterIpv4.ip),
				([, host]) => `nix run .#nixos-bootstrap -- root@${host} .#pluto`,
			),
			cwd: REPO_ROOT,
			memo: BOOTSTRAP_MEMO,
		});
		yield* Command.Exec("JupiterNixos", {
			command: Output.map(
				Output.all(jupiterNixosBootstrap.hash, jupiterIpv4.ip),
				([, host]) => `nix run .#nixos-deploy -- atahan@${host} .#jupiter`,
			),
			cwd: REPO_ROOT,
			memo: NIX_MEMO,
		});

		const saturn = yield* Aws.exitNode({
			name: "saturn",
			publicKey: deployKey,
			instanceType: "t4g.medium",
		});
		const saturnBootstrap = yield* Command.Exec("SaturnNixosBootstrap", {
			command: Output.map(
				Output.all(saturn.grown, saturn.associated, saturn.publicIp),
				([, , host]) => `nix run .#nixos-bootstrap -- root@${host} .#saturn`,
			),
			cwd: REPO_ROOT,
			memo: BOOTSTRAP_MEMO,
		});
		yield* Command.Exec("SaturnNixos", {
			command: Output.map(
				Output.all(saturnBootstrap.hash, saturn.publicIp),
				([, host]) => `nix run .#nixos-deploy -- atahan@${host} .#saturn`,
			),
			cwd: REPO_ROOT,
			memo: NIX_MEMO,
		});

		const zone = yield* Cloudflare.Zone.Zone("Domain", {
			name: infra.domain,
		});
		const netbirdRecord = yield* Cloudflare.DNS.Record("NetbirdDnsRecord", {
			zoneId: zone.zoneId,
			name: infra.netbirdManagementDomain,
			type: "A",
			content: marsIp,
			proxied: false,
			ttl: "1",
		});
		const netbirdApiBaseUrl = Output.map(netbirdRecord.content, () => `https://${infra.netbirdManagementDomain}`);
		yield* Cloudflare.DNS.Record("ProxyWildcardDnsRecord", {
			zoneId: zone.zoneId,
			name: `*.${infra.domain}`,
			type: "A",
			content: marsIp,
			proxied: false,
			ttl: "1",
		});

		const adminPassword = yield* AdminPassword({ length: 24 });
		const setup = yield* NetBird.Setup("Admin", {
			apiBaseUrl: netbirdApiBaseUrl,
			email: me.email,
			name: me.name,
			password: adminPassword,
			patExpireIn: 365,
			// Wait for NixOS install/rebuild before hitting the management API.
			ready: Output.map(marsNixos.hash, hash => hash.input ?? "pending"),
		});

		// Bootstrap credentials so NetBird API resources can authenticate.
		const credentialsReady = yield* UpdateNetBirdCredentialsRef({
			apiBaseUrl: setup.apiBaseUrl,
			apiToken: setup.personalAccessToken,
		});

		const adminApiKey = yield* NetBird.ApiKey("AdminApiKey", {
			userId: setup.userId,
			name: "admin-full-access",
			expiresIn: 365,
			ready: Output.map(credentialsReady, () => true),
		}).pipe(Alchemy.RemovalPolicy.retain());

		yield* UpdateNetBirdCredentialsRef({
			apiBaseUrl: setup.apiBaseUrl,
			apiToken: Output.map(Output.all(adminApiKey.token, setup.personalAccessToken), ([provisioned, fallback]) =>
				preferProvisionedApiToken(provisioned, fallback),
			),
		});

		return {
			zone: zone.name,
			mars: {
				ip: marsIp,
				serverId: marsServer.serverId,
			},
			jupiter: {
				ip: jupiterIpv4.ip,
				serverId: jupiter.serverId,
			},
			saturn: {
				ip: saturn.publicIp,
				instanceId: saturn.instance.instanceId,
			},
			apiBaseUrl: netbirdApiBaseUrl,
			admin: {
				email: setup.email,
				password: adminPassword,
			},
		};
	}),
);
