import * as NetBird from "@yorganci/netbird-alchemy";
import * as Action from "alchemy/Action";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Command from "alchemy/Command";
import * as Doppler from "alchemy/Doppler";
import * as Output from "alchemy/Output";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { Aws, Hetzner, NetbirdServer, NetbirdServerStack, NixExpr } from "../src/index.ts";

const FlakeMe = Schema.Struct({
	name: Schema.String,
	email: Schema.String,
	username: Schema.String,
	shell: Schema.String,
	key: Schema.String,
	// Not `authorizedKeys[0]`: login keys must be free to change, while this key
	// is baked into Saturn's key pair and user data, which replace the instance.
	deployKey: Schema.String,
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
 * The repository root, relative to `packages/stack`. `NixExpr` resolves it
 * against the stack package itself; `Command.Exec` resolves it against the
 * working directory, so commands assume Alchemy is launched from
 * `packages/stack` (as the package scripts and Justfile do).
 */
const REPO_ROOT = "../..";

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

// A NixOS deploy is triggered by its host's system (see `hostSystem`), so it
// hashes no repository files.
const DEPLOY_MEMO = { include: [] as string[] };

/**
 * The system a host's NixOS configuration evaluates to. Passed to the host's
 * deploy so it re-runs exactly when that host's system changes: not for module
 * edits or lockfile bumps that do not reach it. `nixos-deploy` also skips a
 * host already running this system, so a deploy re-run after state is rebuilt
 * leaves hosts untouched.
 */
const hostSystem = (logicalId: string, host: string) =>
	Effect.gen(function* () {
		const expr = yield* NixExpr.NixExpr(logicalId, {
			cwd: REPO_ROOT,
			expression: `.#nixosConfigurations.${host}.config.system.build.toplevel.outPath`,
		});
		return yield* NixExpr.decode(expr, Schema.String);
	});

/**
 * Saturn boots this Ubuntu 24.04 arm64 AMI once; `nixos-bootstrap` then
 * replaces the OS. Pinned because an AMI change replaces the instance: the
 * `EC2.ubuntu2404()` lookup used before resolved to the latest release on
 * every plan. This is the image the running instance was launched from.
 */
const SATURN_AMI = "ami-03e774c3214166a53";

// Bootstrapping installs NixOS once per server, so its memo tracks no
// repository content: configuration changes must not re-run it. A server
// replacement changes the command (new host) and runs it again.
const BOOTSTRAP_MEMO = { include: [] as string[] };

export default NetbirdServerStack.make(
	{
		providers: Layer.mergeAll(
			Cloudflare.providers(),
			Hetzner.providers(),
			Aws.providers(),
			NetBird.providers(),
			NixExpr.NixExprProvider(),
		),
		state: Cloudflare.state(),
		secrets: [Doppler.Secrets({ project: "nix-config", config: "dev" })],
	},
	Effect.gen(function* () {
		const [me, infra] = yield* Effect.all([meExpr, infraExpr]);

		const deployKey = me.deployKey;

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
			env: { NIXOS_SYSTEM: yield* hostSystem("MarsSystem", "mars") },
			memo: DEPLOY_MEMO,
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
			env: { NIXOS_SYSTEM: yield* hostSystem("JupiterSystem", "jupiter") },
			memo: DEPLOY_MEMO,
		});

		const saturn = yield* Aws.exitNode({
			name: "saturn",
			publicKey: deployKey,
			imageId: SATURN_AMI,
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
			env: { NIXOS_SYSTEM: yield* hostSystem("SaturnSystem", "saturn") },
			memo: DEPLOY_MEMO,
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
			// Wait for NixOS install/rebuild before hitting the management API.
			ready: Output.map(marsNixos.hash, hash => hash.input ?? "pending"),
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
