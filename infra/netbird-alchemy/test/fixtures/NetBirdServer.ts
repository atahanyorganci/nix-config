import * as Docker from "alchemy/Docker";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { FileSystem } from "effect/FileSystem";
import { Path } from "effect/Path";
import * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";
import { findAvailablePort } from "./Runtime.ts";

export const NETBIRD_SERVER_IMAGE = "netbirdio/netbird-server";
export const NETBIRD_SERVER_TAG = "0.75.0";

export class NetBirdBootstrapError extends Data.TaggedError("NetBirdBootstrapError")<{
	readonly message: string;
}> {}

const SetupResponse = Schema.Struct({
	personal_access_token: Schema.String,
});

export interface NetBirdServerResources {
	readonly baseUrl: string;
	readonly hostPort: number;
}

export interface NetBirdServerHandle extends NetBirdServerResources {
	readonly apiToken: Redacted.Redacted<string>;
}

/**
 * Wait until the management HTTP API answers `GET /api/instance`.
 * Bounded exponential retries — never a wall-clock sleep loop.
 *
 * Call **after** `deploy(fixtureStack)` returns (container has been applied).
 */
export const waitUntilReady = (baseUrl: string) =>
	Effect.gen(function* () {
		const client = yield* HttpClient.HttpClient;
		yield* client.get(`${baseUrl}/api/instance`).pipe(
			Effect.flatMap(HttpClientResponse.filterStatusOk),
			Effect.asVoid,
			Effect.retry({
				schedule: Schedule.exponential("250 millis"),
				times: 40,
			}),
		);
	});

/**
 * Create the first owner via `POST /api/setup` and return a one-time PAT.
 * Requires `NB_SETUP_PAT_ENABLED=true` on the server.
 */
export const bootstrapPat = (baseUrl: string) =>
	Effect.gen(function* () {
		const client = yield* HttpClient.HttpClient;
		const request = yield* HttpClientRequest.post(`${baseUrl}/api/setup`).pipe(
			HttpClientRequest.bodyJson({
				email: "alchemy-test@example.com",
				name: "Alchemy Test Admin",
				password: "alchemy-test-password-123",
				create_pat: true,
				pat_expire_in: 7,
			}),
		);
		const response = yield* client
			.execute(request)
			.pipe(
				Effect.flatMap(HttpClientResponse.filterStatusOk),
				Effect.flatMap(HttpClientResponse.schemaBodyJson(SetupResponse)),
			);
		return Redacted.make(response.personal_access_token);
	}).pipe(
		Effect.mapError(
			cause =>
				new NetBirdBootstrapError({
					message: `Failed to bootstrap NetBird PAT: ${String(cause)}`,
				}),
		),
	);

/**
 * Alchemy resources for an ephemeral NetBird management server (fixture stack).
 */
export const deployNetBirdServerResources = Effect.gen(function* () {
	const fs = yield* FileSystem;
	const path = yield* Path;
	const hostPort = yield* findAvailablePort();
	const baseUrl = `http://127.0.0.1:${hostPort}`;

	const templatePath = path.join(import.meta.dirname, "netbird-server.config.yaml");
	const template = yield* fs.readFileString(templatePath);
	const configBody = template.replaceAll("@exposedAddress@", baseUrl);

	const configDir = yield* fs.makeTempDirectory({ prefix: "netbird-alchemy-config-" });
	const configPath = path.join(configDir, "config.yaml");
	yield* fs.writeFileString(configPath, configBody);

	const image = yield* Docker.RemoteImage("NetBirdImage", {
		name: NETBIRD_SERVER_IMAGE,
		tag: NETBIRD_SERVER_TAG,
		alwaysPull: false,
	});
	const data = yield* Docker.Volume("NetBirdData", {});
	yield* Docker.Container("NetBirdServer", {
		image,
		start: true,
		ports: [{ external: hostPort, internal: 80 }],
		volumes: [
			{
				hostPath: data.name,
				containerPath: "/var/lib/netbird",
			},
			{
				hostPath: configPath,
				containerPath: "/etc/netbird/config.yaml",
				readOnly: true,
			},
		],
		environment: {
			NB_SETUP_PAT_ENABLED: "true",
			NB_DISABLE_GEOLITE_UPDATE: "true",
			// Skip GeoLite download so management HTTP starts immediately.
			NB_DISABLE_GEOLOCATION: "true",
		},
		command: ["--config", "/etc/netbird/config.yaml"],
	});

	return { baseUrl, hostPort } satisfies NetBirdServerResources;
});
