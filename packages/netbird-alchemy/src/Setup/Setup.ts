import { isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";

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
	 * Admin password. Generated on first setup when omitted. Either way the
	 * password the owner account was created with is persisted in the
	 * `password` attribute — NetBird will not return it again.
	 */
	password?: Redacted.Redacted<string>;
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
	/** API base URL used for setup. */
	apiBaseUrl: string;
}

export type Setup = Resource<"NetBird.Setup", SetupProps, SetupAttributes>;

/**
 * First-time NetBird management bootstrap via unauthenticated `POST /api/setup`.
 *
 * Creates the owner account only. API credentials are supplied out of band via
 * `NB_PAT` (mint a token from the dashboard), so no PAT is
 * requested here. The admin password is generated unless supplied, persisted
 * in Alchemy state and reused when setup is already complete
 * (`setup_required: false`).
 *
 * @resource
 * @product Setup
 * @category NetBird
 * @section Bootstrapping Management
 * @example Admin account
 * ```typescript
 * const setup = yield* NetBird.Setup("Admin", {
 *   apiBaseUrl: "https://netbird.example.com",
 *   email: "admin@example.com",
 *   name: "Admin",
 * });
 * // setup.password holds the generated password.
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
});

const PASSWORD_BYTES = 24;

/**
 * A random admin password: `Nb`, 48 hex digits and `!`, so it holds upper- and
 * lowercase letters, digits and a symbol.
 */
const generatePassword = () => {
	const bytes = crypto.getRandomValues(new Uint8Array(PASSWORD_BYTES));
	const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
	return Redacted.make(`Nb${hex}!`);
};

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
			const email = props.email;
			const name = props.name;

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
				if (output?.password) {
					return {
						userId: output.userId,
						email: output.email,
						password: output.password,
						apiBaseUrl,
					} satisfies SetupAttributes;
				}
				return yield* Effect.fail(
					new NetBirdSetupError({
						message:
							"NetBird setup is already complete but Alchemy has no stored admin password. " +
							"Destroy management state and redeploy, or recover the password out of band.",
					}),
				);
			}

			// Reuse a password from an earlier setup (e.g. management state was
			// wiped) so the stored credential stays valid.
			const password = props.password ?? output?.password ?? generatePassword();

			const request = yield* HttpClientRequest.post(`${apiBaseUrl}/api/setup`).pipe(
				HttpClientRequest.bodyJson({
					email,
					name,
					password: Redacted.value(password),
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

			return {
				userId: created.user_id,
				email: created.email,
				password,
				apiBaseUrl,
			} satisfies SetupAttributes;
		}),
		delete: () => Effect.void,
	});
