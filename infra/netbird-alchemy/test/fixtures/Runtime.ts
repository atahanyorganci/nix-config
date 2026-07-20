import * as Effect from "effect/Effect";
import * as NodeChildProcess from "node:child_process";
import * as NodeNet from "node:net";

/** True when the local Docker daemon answers `docker info`. */
export const isDockerReady = NodeChildProcess.spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;

/** Allocate an ephemeral free TCP port on 127.0.0.1. */
export const findAvailablePort = () =>
	Effect.callback<number, Error>(resume => {
		const server = NodeNet.createServer();
		server.unref();
		server.on("error", error => resume(Effect.fail(error)));
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			const port = typeof address === "object" && address ? address.port : undefined;
			server.close(error => {
				if (error) {
					resume(Effect.fail(error));
					return;
				}
				if (port) {
					resume(Effect.succeed(port));
					return;
				}
				resume(Effect.fail(new Error("Failed to allocate a free host port")));
			});
		});
	});
