import { BunFileSystem } from "@effect/platform-bun";
import { primaryIpsIdGet } from "@yorganci/hetzner-api/primaryIpsIdGet";
import { serversIdDelete } from "@yorganci/hetzner-api/serversIdDelete";
import { serversIdGet } from "@yorganci/hetzner-api/serversIdGet";
import * as Test from "alchemy/Test/Vitest";
import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { MinimumLogLevel } from "effect/References";
import { expect } from "vitest";
import { waitForActions } from "../src/actions.ts";
import { catchNotFound } from "../src/errors.ts";
import * as Hetzner from "../src/index.ts";
import type { StackServices } from "alchemy/Stack";

/** Deterministic ed25519 public key for live tests (not used for real access). */
const TEST_PUBLIC_KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOLuVa504jpmIZvjG3Bxvq2tku7Eikm44e3kEwaNpOtl alchemy-test";

const PREFIX = `alchemy-hetzner-${Date.now().toString(36)}`;

/** Env vars preferred; fall back to `.env.local` for local runs. */
const TestConfigLayer = Layer.unwrap(
	Effect.gen(function* () {
		const dotenv = yield* ConfigProvider.fromDotEnv({ path: ".env.local" }).pipe(
			Effect.catch(() => Effect.succeed(undefined)),
		);
		const provider = dotenv ? ConfigProvider.orElse(ConfigProvider.fromEnv(), dotenv) : ConfigProvider.fromEnv();
		return ConfigProvider.layer(provider);
	}).pipe(Effect.orDie),
).pipe(Layer.provide(BunFileSystem.layer));

const { test } = Test.make({
	providers: Hetzner.providers().pipe(Layer.provideMerge(TestConfigLayer)) as Layer.Layer<
		Layer.Success<ReturnType<typeof Hetzner.providers>>,
		never,
		StackServices
	>,
});

const withLogLevel = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const debug = yield* Config.boolean("DEBUG").pipe(Config.withDefault(false));
		return yield* effect.pipe(Effect.provideService(MinimumLogLevel, debug ? "Debug" : "Info"));
	});

test.provider(
	"compose SSH key, firewall, primary IP, and server with stable IPv4",
	stack =>
		Effect.gen(function* () {
			// Required — fails the test when missing from env / `.env.local`.
			yield* Config.redacted("HETZNER_API_TOKEN");

			const location = yield* Config.string("HETZNER_TEST_LOCATION").pipe(Config.withDefault("nbg1"));
			const serverType = yield* Config.string("HETZNER_TEST_SERVER_TYPE").pipe(Config.withDefault("cpx12"));
			const image = yield* Config.string("HETZNER_TEST_IMAGE").pipe(Config.withDefault("ubuntu-24.04"));

			yield* stack.destroy();

			const deployed = yield* stack.deploy(
				Effect.gen(function* () {
					const sshKey = yield* Hetzner.SshKey("BootstrapKey", {
						name: `${PREFIX}-key`,
						publicKey: TEST_PUBLIC_KEY,
					});
					const firewall = yield* Hetzner.Firewall("SshFirewall", {
						name: `${PREFIX}-fw`,
						rules: [
							{
								direction: "in",
								protocol: "tcp",
								port: "22",
								sourceIps: ["0.0.0.0/0", "::/0"],
								description: "SSH",
							},
						],
					});
					const primaryIp = yield* Hetzner.PrimaryIp("StableIpv4", {
						name: `${PREFIX}-ip`,
						type: "ipv4",
						location,
						autoDelete: false,
					});
					const server = yield* Hetzner.Server("Vm", {
						name: `${PREFIX}-vm`,
						serverType,
						image,
						location,
						sshKeys: [sshKey.name],
						firewalls: [firewall.firewallId],
						primaryIpv4Id: primaryIp.primaryIpId,
					});
					return { sshKey, firewall, primaryIp, server };
				}),
			);

			expect(deployed.sshKey.sshKeyId).toBeGreaterThan(0);
			expect(deployed.sshKey.fingerprint.length).toBeGreaterThan(0);
			expect(deployed.firewall.firewallId).toBeGreaterThan(0);
			expect(deployed.firewall.rules).toHaveLength(1);
			expect(deployed.primaryIp.primaryIpId).toBeGreaterThan(0);
			expect(deployed.primaryIp.ip).toBeTruthy();
			expect(deployed.primaryIp.location).toEqual(location);
			expect(deployed.server.serverId).toBeGreaterThan(0);
			expect(deployed.server.ipv4).toEqual(deployed.primaryIp.ip);
			expect(deployed.server.primaryIpv4Id).toEqual(deployed.primaryIp.primaryIpId);
			expect(deployed.server.firewalls).toContain(deployed.firewall.firewallId);

			const liveServer = yield* serversIdGet({ id: deployed.server.serverId });
			expect(liveServer.server?.public_net.ipv4?.ip).toEqual(deployed.primaryIp.ip);

			// Deleting the server via API leaves the Primary IP when autoDelete is false.
			const deleted = yield* serversIdDelete({ id: deployed.server.serverId });
			yield* waitForActions(deleted.action ? [deleted.action] : []);

			const retainedIp = yield* primaryIpsIdGet({ id: deployed.primaryIp.primaryIpId });
			expect(retainedIp.primary_ip.ip).toEqual(deployed.primaryIp.ip);
			expect(retainedIp.primary_ip.assignee_id).toBeNull();

			yield* stack.destroy();

			const afterServer = yield* catchNotFound(serversIdGet({ id: deployed.server.serverId }));
			expect(afterServer).toBeUndefined();

			const afterIp = yield* catchNotFound(primaryIpsIdGet({ id: deployed.primaryIp.primaryIpId }));
			expect(afterIp).toBeUndefined();
		}).pipe(withLogLevel),
	{ timeout: 300_000 },
);
