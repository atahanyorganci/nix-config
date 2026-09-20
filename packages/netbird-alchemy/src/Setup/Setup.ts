import { isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

export class NetBirdSetupError extends Data.TaggedError("NetBirdSetupError")<{
	readonly message: string;
}> {}

export interface SetupProps {
	/**
	 * Management API base URL (no trailing slash), e.g. `https://netbird.example.com`.
	 */
	apiBaseUrl: string;
	/**
	 * Admin email for the initial owner account.
	 */
	email: string;
	/**
	 * Display name for the initial owner account.
	 */
	name: string;
	/**
	 * Admin password. Generated once (e.g. via `Alchemy.Random`) and persisted
	 * in Alchemy state — NetBird will not return it again.
	 */
	password: Redacted.Redacted<string>;
	/**
	 * PAT lifetime in **days** when `create_pat` is requested.
	 *
	 * @default 365
	 */
	patExpireIn?: number;
	/**
	 * Optional dependency edge (e.g. NixOS `Command.Exec` hash). Ignored by
	 * the provider; include any upstream Output so Setup waits for it.
	 */
	ready?: string | boolean | null;
}

export interface SetupAttributes {
	/** Owner user id returned by `/api/setup`. */
	userId: string;
	/** Admin email. */
	email: string;
	/** Admin password (persisted from props; never re-fetched). */
	password: Redacted.Redacted<string>;
	/** Personal access token minted at setup (`create_pat: true`). */
	personalAccessToken: Redacted.Redacted<string>;
	/** API base URL used for setup. */
	apiBaseUrl: string;
}

export type Setup = Resource<"NetBird.Setup", SetupProps, SetupAttributes>;

/**
 * First-time NetBird management bootstrap via unauthenticated `POST /api/setup`.
 *
 * Requires the management server to run with `NB_SETUP_PAT_ENABLED=true` so a
 * PAT is returned. Secrets are persisted in Alchemy state and reused when
 * setup is already complete (`setup_required: false`).
 *
 * @resource
 * @product Setup
 * @category NetBird
 * @section Bootstrapping Management
 * @example Admin + PAT
 * ```typescript
 * const password = yield* Alchemy.Random("AdminPassword", { bytes: 24 });
 * const setup = yield* NetBird.Setup("Admin", {
 *   apiBaseUrl: "https://netbird.example.com",
 *   email: "admin@example.com",
 *   name: "Admin",
 *   password: password.text,
 * });
 * ```
 */
export const Setup = Resource<Setup>("NetBird.Setup");

export const isSetup = (value: unknown): value is Setup =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.Setup";

const InstanceResponse = Schema.Struct({
	setup_required: Schema.Boolean,
});

const SetupResponse = Schema.Struct({
	user_id: Schema.String,
	email: Schema.String,
	personal_access_token: Schema.optional(Schema.String),
});

export const SetupProvider = () =>
	Provider.succeed(Setup, {
		stables: ["userId", "email", "apiBaseUrl"],
		diff: ({ news }) =>
			Effect.sync(() => {
				if (!isResolved(news)) return undefined;
				// Email/name/password identity is fixed after first setup; ignore drift.
			}),
		read: ({ output }) => Effect.succeed(output),
		list: () => Effect.succeed([]),
		reconcile: Effect.fn(function* ({ news, output }) {
			const props = news ?? ({} as SetupProps);
			const apiBaseUrl = props.apiBaseUrl.replace(/\/$/, "");
			const patExpireIn = props.patExpireIn ?? 365;
			const password = props.password;
			const email = props.email;
			const name = props.name;

			if (!password) {
				return yield* Effect.fail(new NetBirdSetupError({ message: "NetBird.Setup requires a password" }));
			}

			const client = yield* HttpClient.HttpClient;

			const instance = yield* client.get(`${apiBaseUrl}/api/instance`).pipe(
				Effect.flatMap(HttpClientResponse.filterStatusOk),
				Effect.flatMap(HttpClientResponse.schemaBodyJson(InstanceResponse)),
				Effect.retry({
					schedule: Schedule.exponential("1 second"),
					times: 90,
				}),
				Effect.mapError(
					cause =>
						new NetBirdSetupError({
							message: `NetBird management API not ready at ${apiBaseUrl}: ${String(cause)}`,
						}),
				),
			);

			if (!instance.setup_required) {
				if (output?.personalAccessToken && output.password) {
					return {
						userId: output.userId,
						email: output.email,
						password: output.password,
						personalAccessToken: output.personalAccessToken,
						apiBaseUrl,
					} satisfies SetupAttributes;
				}
				return yield* Effect.fail(
					new NetBirdSetupError({
						message:
							"NetBird setup is already complete but Alchemy has no stored admin password/PAT. " +
							"Set NETBIRD_API_TOKEN or destroy management state and redeploy.",
					}),
				);
			}

			const request = yield* HttpClientRequest.post(`${apiBaseUrl}/api/setup`).pipe(
				HttpClientRequest.bodyJson({
					email,
					name,
					password: Redacted.value(password),
					create_pat: true,
					pat_expire_in: patExpireIn,
				}),
			);

			const created = yield* client.execute(request).pipe(
				Effect.flatMap(HttpClientResponse.filterStatusOk),
				Effect.flatMap(HttpClientResponse.schemaBodyJson(SetupResponse)),
				Effect.mapError(
					cause =>
						new NetBirdSetupError({
							message: `POST /api/setup failed: ${String(cause)}`,
						}),
				),
			);

			if (!created.personal_access_token) {
				return yield* Effect.fail(
					new NetBirdSetupError({
						message:
							"POST /api/setup succeeded without personal_access_token. " +
							"Ensure NB_SETUP_PAT_ENABLED=true on netbird-server.",
					}),
				);
			}

			return {
				userId: created.user_id,
				email: created.email,
				password,
				personalAccessToken: Redacted.make(created.personal_access_token),
				apiBaseUrl,
			} satisfies SetupAttributes;
		}),
		delete: () => Effect.void,
	});
