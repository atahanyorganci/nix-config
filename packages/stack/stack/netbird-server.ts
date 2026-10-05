import * as NetBird from "@yorganci/netbird-alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Command from "alchemy/Command";
import * as Doppler from "alchemy/Doppler";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { Aws, Hetzner, NetbirdServer, NetbirdServerStack, NixExpr } from "../src/index.ts";

/**
 * The repository root, relative to `packages/stack`. `NixExpr` resolves it
 * against the stack package itself; `Command.Exec` resolves it against the
 * working directory, so commands assume Alchemy is launched from
 * `packages/stack` (as the package scripts and Justfile do).
 */
const REPO_ROOT = "../..";

// Flake values are evaluated while planning (`NixExpr.evaluate`), not kept as
// `NixExpr` resources: each reaches state only through the props of the
// resources that use it, so a flake change shows up exactly where it lands,
// and fields these schemas drop (login keys, shell, ...) never show up.

const Me = Schema.Struct({
	name: Schema.String,
	email: Schema.String,
	username: Schema.String,
	// Not `authorizedKeys[0]`: login keys must be free to change, while this key
	// is baked into Saturn's key pair and user data, which replace the instance.
	deployKey: Schema.String,
});

const Infra = Schema.Struct({
	domain: Schema.String,
	netbirdManagementDomain: Schema.String,
});

// A NixOS deploy is triggered by its host's system (see `hostSystem`), so it
// hashes no repository files.
const DEPLOY_MEMO = { include: [] as string[] };

/**
 * The system a host's NixOS configuration evaluates to: its store path, which
 * changes exactly when the host's closure does. Passed to the host's deploy so
 * it re-runs only then: not for module edits, commits or lockfile bumps that
 * do not reach it (these hosts do not set `system.configurationRevision`).
 * `nixos-deploy` also skips a host already running this system, so a deploy
 * re-run after state is rebuilt leaves hosts untouched.
 */
const hostSystem = (host: string) =>
	NixExpr.evaluate(
		{
			cwd: REPO_ROOT,
			expression: `.#nixosConfigurations.${host}.config.system.build.toplevel.outPath`,
		},
		Schema.String,
	);

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
			// No resource here is a `NixExpr` any more. The provider stays only so
			// the next deploy can delete the `FlakeMe` and `Infra` rows earlier
			// deploys created (a row without a provider fails the plan). Drop it
			// once those rows are gone.
			NixExpr.NixExprProvider(),
		),
		state: Cloudflare.state(),
		secrets: [Doppler.Secrets({ project: "nix-config", config: "dev" })],
	},
	Effect.gen(function* () {
		const [me, infra, systems] = yield* Effect.all([
			NixExpr.evaluate({ cwd: REPO_ROOT, expression: ".#me" }, Me),
			NixExpr.evaluate({ cwd: REPO_ROOT, expression: ".#infra" }, Infra),
			Effect.all({
				mars: hostSystem("mars"),
				jupiter: hostSystem("jupiter"),
				saturn: hostSystem("saturn"),
			}),
		]);

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
		// The trailing host name makes nixos-bootstrap install that host's backed-up
		// SSH identity, so a recreated server keeps its pinned key and can decrypt
		// its secrets on first boot.
		const marsBootstrap = yield* Command.Exec("MarsNixosBootstrap", {
			command: Output.map(
				Output.all(marsServer.serverId, marsIp),
				([, host]) => `nix run .#nixos-bootstrap -- root@${host} .#pluto mars`,
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
			env: { NIXOS_SYSTEM: systems.mars },
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
				([, host]) => `nix run .#nixos-bootstrap -- root@${host} .#pluto jupiter`,
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
			env: { NIXOS_SYSTEM: systems.jupiter },
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
				([, , host]) => `nix run .#nixos-bootstrap -- root@${host} .#saturn saturn`,
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
			env: { NIXOS_SYSTEM: systems.saturn },
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
		// A plain string, so it is always resolved when diffing `Admin`; the DNS
		// record is ordered before `Admin` through `ready` instead.
		const netbirdApiBaseUrl = `https://${infra.netbirdManagementDomain}`;
		yield* Cloudflare.DNS.Record("ProxyWildcardDnsRecord", {
			zoneId: zone.zoneId,
			name: `*.${infra.domain}`,
			type: "A",
			content: marsIp,
			proxied: false,
			ttl: "1",
		});

		// Setup generates the admin password and keeps the one the account was
		// created with; `setup.password` is the only source of it.
		const setup = yield* NetBird.Setup("Admin", {
			apiBaseUrl: netbirdApiBaseUrl,
			email: me.email,
			name: me.name,
			// Order only: the management API needs its DNS record and Mars's NixOS
			// install/rebuild. Setup's diff ignores this, so Mars deploys do not
			// update `Admin`.
			ready: Output.map(Output.all(netbirdRecord.content, marsNixos.hash), () => true),
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
				password: setup.password,
			},
		};
	}),
);
