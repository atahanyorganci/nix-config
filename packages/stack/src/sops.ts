import * as Effect from "effect/Effect";
import * as ChildProcess from "effect/process/ChildProcess";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import * as Redacted from "effect/Redacted";
import * as Stream from "effect/Stream";

/** sops's index syntax for a `/`-separated key: `a/b-c` -> `["a"]["b-c"]`. */
export const sopsIndex = (key: string) =>
	key
		.split("/")
		.map(part => `[${JSON.stringify(part)}]`)
		.join("");

/**
 * One value from a SOPS file, decrypted with the `sops` CLI and the admin key
 * (the YubiKey). `key` is `/`-separated like a sops-nix secret name.
 *
 * The value reaches this process on stdout and nothing else: it is never an
 * argument, and `sops`'s diagnostics go to the terminal. A failed decrypt is
 * an error rather than an empty value.
 */
export const decrypt = Effect.fn("Sops.decrypt")(function* (file: string, key: string) {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const [stdout, exitCode] = yield* Effect.scoped(
		Effect.gen(function* () {
			const handle = yield* spawner.spawn(
				ChildProcess.make("sops", ["--decrypt", "--extract", sopsIndex(key), file], {
					stdin: "ignore",
					stderr: "inherit",
				}),
			);
			return yield* Effect.all([handle.stdout.pipe(Stream.decodeText(), Stream.mkString), handle.exitCode], {
				concurrency: "unbounded",
			});
		}),
	).pipe(
		Effect.catch(cause =>
			Effect.die(new Error(`could not run sops for ${key}; run the stack from the infra shell`, { cause })),
		),
	);
	if (exitCode !== 0) {
		return yield* Effect.die(
			new Error(`sops could not decrypt ${key} from ${file} (exit ${exitCode}); is the YubiKey present?`),
		);
	}
	// `--extract` prints a string value with a trailing newline.
	const value = stdout.endsWith("\n") ? stdout.slice(0, -1) : stdout;
	if (value === "") {
		return yield* Effect.die(new Error(`${key} in ${file} is empty`));
	}
	return Redacted.make(value);
});
