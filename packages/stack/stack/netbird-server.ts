import * as NetBird from "@yorganci/netbird-alchemy";
import * as AWS from "alchemy/AWS";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Command from "alchemy/Command";
import * as Doppler from "alchemy/Doppler";
import * as Hetzner from "alchemy/Hetzner";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { NetbirdServer, NetbirdServerStack, Nix, Aws, Ses, Sops } from "../src/index.ts";

/**
 * The repository root, relative to `packages/stack`. `Nix` resources and
 * `Command.Exec` resolve it against the working directory, so the stack
 * assumes Alchemy is launched from `packages/stack` (as the package scripts
 * and Justfile do).
 */
const REPO_ROOT = "../..";

// Flake values are evaluated while planning (`Nix.evaluate`), not kept as
// `Nix.Expr` resources: each reaches state only through the props of the
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
	mailDomain: Schema.String,
});

/** `flake.stackAdmin`: who NetBird's owner is, and where its password is. */
const StackAdmin = Schema.Struct({
	name: Schema.String,
	email: Schema.String,
	passwordSecret: Schema.String,
	secretsFile: Schema.String,
});

/**
 * The service user `Setup` creates on a new server, whose key is `NB_PAT`
 * (`just netbird-token`). The names match the running installation's, which
 * was set up by hand.
 */
const AUTOMATION = { name: "NB_PAT", tokenName: "Doppler", expiresIn: 365 };

/**
 * Saturn boots this Ubuntu 24.04 arm64 AMI once; `nixos-bootstrap` then
 * replaces the OS. Pinned because an AMI change replaces the instance: the
 * `EC2.ubuntu2404()` lookup used before resolved to the latest release on
 * every plan. This is the image the running instance was launched from.
 */
const SATURN_AMI = "ami-03e774c3214166a53";

/** `RootDeviceName` of `SATURN_AMI`; the root volume is sized through it. */
const SATURN_ROOT_DEVICE = "/dev/sda1";

/**
 * The account's default VPC in us-east-2. Saturn launches into it rather than
 * a VPC of its own, so it brings no network resources to create or tear down.
 */
const DEFAULT_VPC_ID = "vpc-018d997ddab8c22ca";

/** Saturn's zone; its default subnet supplies the public IPv4 address. */
const SATURN_AZ = "us-east-2a";

// Bootstrapping installs NixOS once per server, so its memo tracks no
// repository content: configuration changes must not re-run it. A server
// replacement changes the command (new host) and runs it again.
const BOOTSTRAP_MEMO = { include: [] as string[] };

export default NetbirdServerStack.make(
	{
		providers: Layer.mergeAll(
			Cloudflare.providers(),
			Hetzner.providers(),
			AWS.providers(),
			NetBird.providers(),
			Nix.providers(),
		),
		state: Cloudflare.state(),
		secrets: [Doppler.Secrets({ project: "nix-config", config: "dev" })],
	},
	Effect.gen(function* () {
		const [me, infra, admin] = yield* Effect.all([
			Nix.evaluate({ flakeRoot: REPO_ROOT, attr: "me" }, Me),
			Nix.evaluate({ flakeRoot: REPO_ROOT, attr: "infra" }, Infra),
			Nix.evaluate({ flakeRoot: REPO_ROOT, attr: "stackAdmin" }, StackAdmin),
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
		// Deploys when mars's configuration evaluates to a new system (see `Nix.NixOS`).
		const marsNixos = yield* Nix.NixOS("MarsNixos", {
			flakeRoot: REPO_ROOT,
			configuration: "mars",
			command: Output.map(marsIp, host => `nix run .#nixos-deploy -- atahan@${host} .#mars`),
			after: marsBootstrap.hash,
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
		yield* Nix.NixOS("JupiterNixos", {
			flakeRoot: REPO_ROOT,
			configuration: "jupiter",
			command: Output.map(jupiterIpv4.ip, host => `nix run .#nixos-deploy -- atahan@${host} .#jupiter`),
			after: jupiterNixosBootstrap.hash,
		});

		const saturn = yield* Aws.exitNode({
			name: "saturn",
			publicKey: deployKey,
			imageId: SATURN_AMI,
			rootDeviceName: SATURN_ROOT_DEVICE,
			vpcId: DEFAULT_VPC_ID,
			availabilityZone: SATURN_AZ,
			instanceType: "t4g.medium",
		});
		const saturnBootstrap = yield* Command.Exec("SaturnNixosBootstrap", {
			command: Output.map(saturn.publicIp, host => `nix run .#nixos-bootstrap -- root@${host} .#saturn saturn`),
			// Unused by the command. It ties the bootstrap to the instance, so a
			// replacement runs it again even if AWS hands back the same address.
			env: { SATURN_INSTANCE_ID: saturn.instance.instanceId },
			cwd: REPO_ROOT,
			memo: BOOTSTRAP_MEMO,
		});
		yield* Nix.NixOS("SaturnNixos", {
			flakeRoot: REPO_ROOT,
			configuration: "saturn",
			command: Output.map(saturn.publicIp, host => `nix run .#nixos-deploy -- atahan@${host} .#saturn`),
			after: saturnBootstrap.hash,
		});

		const zone = yield* Cloudflare.Zone.Zone("Domain", {
			name: infra.domain,
		});

		// The hosts' mail goes out through SES in the AWS provider's region,
		// which the SMTP endpoint, password and MAIL FROM records depend on.
		const smtp = yield* Ses.smtpRelay({
			domain: infra.mailDomain,
			zoneId: zone.zoneId,
			region: yield* yield* AWS.Region,
			// Until SES grants production access: verified addresses only.
			sandboxRecipients: [me.email],
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

		// NetBird's owner is the stack's admin, a local user with the password
		// LLDAP's admin has, decrypted from mars's nix-secrets file when the plan
		// resolves it (so planning needs the YubiKey; the scripts that only read
		// this stack's state do not). On a new server, which mars has to be
		// deployed with `netbird-server.bootstrap = true` for, setup also creates
		// the automation service user with the owner's one-time token and deletes
		// that token.
		const setup = yield* NetBird.Setup("Admin", {
			apiBaseUrl: netbirdApiBaseUrl,
			email: admin.email,
			name: admin.name,
			password: Output.fromEffect(Sops.decrypt(admin.secretsFile, admin.passwordSecret)),
			automation: AUTOMATION,
			// Order only: the management API needs its DNS record and Mars's NixOS
			// install/rebuild. Setup's diff ignores this, so Mars deploys do not
			// update `Admin`.
			ready: Output.map(Output.all(netbirdRecord.content, marsNixos.system), () => true),
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
				// Absent on an installation set up before Setup made it.
				automation: setup.automation,
			},
			smtp,
		};
	}),
);
