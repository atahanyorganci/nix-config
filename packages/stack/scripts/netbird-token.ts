import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { credentials } from "@yorganci/netbird-api/Credentials";
import { usersGet } from "@yorganci/netbird-api/users";
import * as Command from "effect/cli/Command";
import * as Flag from "effect/cli/Flag";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import * as Stream from "effect/Stream";
import { lookup, profileFlag, readStackOutput, stageFlag } from "./stack-output.ts";

/**
 * Copies the NetbirdServer stack's automation key (`admin/automation/token`:
 * the service user `NetBird.Setup` creates on a new server) into Doppler as
 * `NB_PAT`, once NetBird has accepted it. The key reaches Doppler on stdin,
 * never as an argument, and is never printed.
 *
 * An installation set up before Setup made that key has none in the stack's
 * output; its `NB_PAT` is kept in Doppler by hand, and this does nothing.
 */

/** Where the stacks read their secrets from (`Doppler.Secrets` in both). */
const DOPPLER = { project: "nix-config", config: "dev" } as const;

const dryRunFlag = Flag.Boolean("dry-run").pipe(
	Flag.withDescription("Check the key, but leave Doppler alone"),
	// A boolean flag left out fails unless it has a default.
	Flag.withDefault(false),
);

const encode = (value: string) => Stream.make(new TextEncoder().encode(value));

const netbirdToken = Command.make("netbird-token", {
	stage: stageFlag,
	profile: profileFlag,
	dryRun: dryRunFlag,
}).pipe(
	Command.withDescription("Copy NetbirdServer's automation key into Doppler's NB_PAT, after checking it works"),
	Command.withHandler(
		Effect.fn(function* ({ stage, profile, dryRun }) {
			const output = yield* readStackOutput("NetbirdServer", { stage, profile });
			const automation = (output as { admin?: { automation?: unknown } }).admin?.automation;
			if (automation === undefined) {
				yield* Console.log(
					"NetbirdServer has no automation key: this installation was set up before Setup made one, so NB_PAT is kept in Doppler by hand.",
				);
				return;
			}
			const token = yield* lookup("NetbirdServer", output, ["admin", "automation", "token"]);
			const name = yield* lookup("NetbirdServer", output, ["admin", "automation", "name"]);
			const expires = yield* lookup("NetbirdServer", output, ["admin", "automation", "expirationDate"]);
			const managementUrl = yield* lookup("NetbirdServer", output, ["apiBaseUrl"]);

			// `/api/users/current` refuses service users, so the check lists users.
			const users = yield* usersGet({}).pipe(
				Effect.provide(
					Layer.mergeAll(
						credentials({ apiToken: token.value, managementUrl: managementUrl.value }),
						FetchHttpClient.layer,
					),
				),
				Effect.catch(cause =>
					Effect.die(`NetBird at ${managementUrl.value} refused ${name.value}'s key: ${String(cause)}`),
				),
			);
			yield* Console.log(
				`${name.value}'s key works against ${managementUrl.value} (${users.length} users), and expires ${expires.value}`,
			);
			if (dryRun) {
				yield* Console.log(`would set NB_PAT in Doppler ${DOPPLER.project}/${DOPPLER.config}`);
				return;
			}

			const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
			// Doppler prints the secrets it set, values included: stdout goes nowhere.
			const exitCode = yield* spawner
				.exitCode(
					ChildProcess.make(
						"doppler",
						["secrets", "set", "NB_PAT", "--project", DOPPLER.project, "--config", DOPPLER.config, "--silent"],
						{ stdin: encode(token.value), stdout: "ignore", stderr: "inherit" },
					),
				)
				.pipe(Effect.catch(cause => Effect.die(`could not run doppler: ${String(cause)}`)));
			if (exitCode !== 0) return yield* Effect.die(`doppler secrets set NB_PAT exited with ${exitCode}`);
			yield* Console.log(`NB_PAT in Doppler ${DOPPLER.project}/${DOPPLER.config} is now ${name.value}'s key`);
		}),
	),
);

Command.run(netbirdToken, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
	NodeRuntime.runMain,
);
