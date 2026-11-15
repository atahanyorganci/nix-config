import {
	usersUserIdTokensGet,
	usersUserIdTokensPost,
	usersUserIdTokensTokenIdDelete,
} from "@yorganci/netbird-api/tokens";
import { usersPost } from "@yorganci/netbird-api/users";
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
import { Credentials } from "../Credentials.ts";
import type { Diff } from "alchemy/Diff";
import type { Input } from "alchemy/Input";

export class NetBirdSetupError extends Data.TaggedError("NetBirdSetupError")<{
	readonly message: string;
}> {}

/**
 * A service user `Setup` creates with the new owner's one-time token, and a
 * key for it.
 */
export interface SetupAutomation {
	/** Name of the service user. */
	name: string;
	/**
	 * Role of the service user. Service users cannot be owners.
	 *
	 * @default "admin"
	 */
	role?: string;
	/** Name of the service user's key. */
	tokenName: string;
	/**
	 * Lifetime of the key in days (1–365).
	 *
	 * @default 365
	 */
	expiresIn?: number;
}

export interface SetupProps {
	/**
	 * Management API base URL (no trailing slash), e.g. `https://netbird.example.com`.
	 */
	apiBaseUrl: string;
	/**
	 * Login of the initial owner account. NetBird requires an email-shaped one
	 * for its local users; nothing is mailed to it.
	 */
	email: string;
	/**
	 * Display name for the initial owner account.
	 */
	name: string;
	/**
	 * Owner password, 8 to 72 characters. Generated on first setup when
	 * omitted, in which case the `password` attribute keeps it: NetBird will
	 * not return it again.
	 */
	password?: Redacted.Redacted<string>;
	/**
	 * Also create a service user, and a key for it, with the owner token
	 * `/api/setup` returns, then delete that token: the key is the only
	 * credential setup leaves behind, so nothing has to be minted in the
	 * dashboard. The server must run with `NB_SETUP_PAT_ENABLED=true`, and,
	 * like the rest of setup, it happens only on a new server.
	 */
	automation?: SetupAutomation;
	/**
	 * Optional dependency edge (e.g. NixOS `Command.Exec` hash). Ignored by
	 * the provider, including when diffing; include any upstream Output so
	 * Setup waits for it.
	 */
	ready?: string | boolean | null;
}

export interface SetupAutomationAttributes {
	/** Service user id. */
	userId: string;
	/** Service user name. */
	name: string;
	/** Key id. */
	tokenId: string;
	/** Key name. */
	tokenName: string;
	/** The key itself; NetBird never returns it again. */
	token: Redacted.Redacted<string>;
	/** Expiration timestamp reported by NetBird. */
	expirationDate: string;
}

export interface SetupAttributes {
	/** Owner user id returned by `/api/setup`. */
	userId: string;
	/** Owner login. */
	email: string;
	/** Generated owner password, when none was given; never re-fetched. */
	password?: Redacted.Redacted<string>;
	/** API base URL used for setup. */
	apiBaseUrl: string;
	/** The service user and key made with the owner's one-time token. */
	automation?: SetupAutomationAttributes;
}

export type Setup = Resource<"NetBird.Setup", SetupProps, SetupAttributes>;

/**
 * First-time NetBird management bootstrap via unauthenticated `POST /api/setup`.
 *
 * Creates the owner account and, with `automation`, a service user and its
 * key through the one-time owner token setup returns, which it then deletes:
 * the key is what the rest of the stack authenticates with (`NB_PAT`). A
 * password left out is generated and kept in state.
 *
 * Setup happens once per management server: after it, the resource only
 * changes when `apiBaseUrl` names a different server, and its stored output
 * is kept.
 *
 * @resource
 * @product Setup
 * @category NetBird
 * @section Bootstrapping Management
 * @example Owner and an automation key
 * ```typescript
 * const setup = yield* NetBird.Setup("Admin", {
 *   apiBaseUrl: "https://netbird.example.com",
 *   email: "admin@example.com",
 *   name: "admin",
 *   password: Redacted.make(secret),
 *   automation: { name: "automation", tokenName: "stack" },
 * });
 * // setup.automation.token is an admin service user's key.
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

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, "");

const PASSWORD_BYTES = 24;

/** NetBird's name for the token `/api/setup` creates. */
export const SETUP_TOKEN_NAME = "setup-token";

/**
 * Days the owner's setup token lives: NetBird's minimum. `Setup` deletes it
 * as soon as it has made the service user's key.
 */
const SETUP_TOKEN_DAYS = 1;

/**
 * How long setup waits for a new server's management API: asked every 5
 * seconds for 10 minutes, each request given 30 seconds. A host that has just
 * been installed answers within a minute or two (its certificate included).
 */
const API_READY_INTERVAL = "5 seconds";
const API_READY_ATTEMPTS = 120;
const REQUEST_TIMEOUT = "30 seconds";

const DEFAULT_AUTOMATION_ROLE = "admin";
const DEFAULT_AUTOMATION_EXPIRES_IN = 365;

/**
 * A random admin password: `Nb`, 48 hex digits and `!`, so it holds upper- and
 * lowercase letters, digits and a symbol.
 */
const generatePassword = () => {
	const bytes = crypto.getRandomValues(new Uint8Array(PASSWORD_BYTES));
	const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
	return Redacted.make(`Nb${hex}!`);
};

/**
 * The owner account's email, name and password are fixed by the first
 * `/api/setup`, as is the service user made then, and `ready` only orders
 * the resource, so none of them is compared. A different management server
 * needs its own setup.
 *
 * Returns `undefined` (the engine's props comparison) before the first setup
 * or while `apiBaseUrl` is still unresolved.
 */
export const diffSetup = ({
	news,
	output,
}: {
	news: Input<SetupProps>;
	output: SetupAttributes | undefined;
}): Diff | undefined => {
	if (!output) return undefined;
	const apiBaseUrl = (news as { apiBaseUrl?: unknown }).apiBaseUrl;
	if (typeof apiBaseUrl !== "string") return undefined;
	return normalizeBaseUrl(apiBaseUrl) === normalizeBaseUrl(output.apiBaseUrl)
		? { action: "noop" }
		: { action: "replace" };
};

/** The body of `POST /api/setup`; a setup token is asked for only with `automation`. */
export const setupRequestBody = (props: {
	email: string;
	name: string;
	password: Redacted.Redacted<string>;
	automation?: SetupAutomation;
}) => ({
	email: props.email,
	name: props.name,
	password: Redacted.value(props.password),
	...(props.automation ? { create_pat: true, pat_expire_in: SETUP_TOKEN_DAYS } : {}),
});

export const SetupProvider = () =>
	Provider.succeed(Setup, {
		stables: ["userId", "email", "apiBaseUrl"],
		diff: ({ news, output }) => Effect.sync(() => diffSetup({ news, output })),
		read: ({ output }) => Effect.succeed(output),
		list: () => Effect.succeed([]),
		reconcile: Effect.fn(function* ({ news, output }) {
			const props = news ?? ({} as SetupProps);
			const apiBaseUrl = normalizeBaseUrl(props.apiBaseUrl);
			const email = props.email;
			const name = props.name;

			const client = yield* HttpClient.HttpClient;

			// Bounded: an exponential backoff without a cap waited, in effect,
			// forever for a server that never came up.
			const instance = yield* client.get(`${apiBaseUrl}/api/instance`).pipe(
				Effect.flatMap(HttpClientResponse.filterStatusOk),
				Effect.flatMap(HttpClientResponse.schemaBodyJson(InstanceResponse)),
				Effect.timeout(REQUEST_TIMEOUT),
				Effect.retry({
					schedule: Schedule.spaced(API_READY_INTERVAL),
					times: API_READY_ATTEMPTS,
				}),
				Effect.mapError(
					cause =>
						new NetBirdSetupError({
							message: `NetBird management API not ready at ${apiBaseUrl} after 10 minutes: ${String(cause)}`,
						}),
				),
			);

			if (!instance.setup_required) {
				if (output) {
					return { ...output, apiBaseUrl } satisfies SetupAttributes;
				}
				return yield* Effect.fail(
					new NetBirdSetupError({
						message:
							`NetBird at ${apiBaseUrl} is already set up, and Alchemy has no record of this setup. ` +
							"Setup only runs on a new server: restore the stack's state, or reset the server's state and deploy again.",
					}),
				);
			}

			// Reuse a generated password from an earlier setup (e.g. management
			// state was wiped) so the stored credential stays valid.
			const generated = props.password === undefined ? (output?.password ?? generatePassword()) : undefined;
			const password = props.password ?? generated!;

			const request = yield* HttpClientRequest.post(`${apiBaseUrl}/api/setup`).pipe(
				HttpClientRequest.bodyJson(
					setupRequestBody({
						email,
						name,
						password,
						...(props.automation ? { automation: props.automation } : {}),
					}),
				),
			);

			const created = yield* client.execute(request).pipe(
				Effect.flatMap(HttpClientResponse.filterStatusOk),
				Effect.flatMap(HttpClientResponse.schemaBodyJson(SetupResponse)),
				Effect.timeout(REQUEST_TIMEOUT),
				Effect.mapError(
					cause =>
						new NetBirdSetupError({
							message: `POST /api/setup failed: ${String(cause)}`,
						}),
				),
			);

			const attributes: SetupAttributes = {
				userId: created.user_id,
				email: created.email,
				apiBaseUrl,
				...(generated ? { password: generated } : {}),
			};
			if (!props.automation) return attributes;

			if (created.personal_access_token === undefined) {
				return yield* Effect.fail(
					new NetBirdSetupError({
						message:
							"NetBird created the owner but returned no setup token: the server has to run with " +
							"NB_SETUP_PAT_ENABLED=true. The owner exists now, so sign in as it and create the service " +
							"user by hand, or reset the server's state and deploy again.",
					}),
				);
			}
			const automation = yield* createAutomation({
				apiBaseUrl,
				ownerId: created.user_id,
				ownerToken: Redacted.make(created.personal_access_token),
				automation: props.automation,
			}).pipe(
				Effect.mapError(
					cause =>
						new NetBirdSetupError({
							message:
								`NetBird created the owner, but the service user or its key failed: ${String(cause)}. ` +
								"The setup token is gone with this process, so sign in as the owner and create them by hand, " +
								"or reset the server's state and deploy again.",
						}),
				),
			);
			return { ...attributes, automation } satisfies SetupAttributes;
		}),
		delete: () => Effect.void,
	});

/**
 * The service user and its key, made with the owner's setup token, which is
 * then deleted: only its own user may delete a person's token, so it has to
 * be this one.
 */
const createAutomation = ({
	apiBaseUrl,
	ownerId,
	ownerToken,
	automation,
}: {
	apiBaseUrl: string;
	ownerId: string;
	ownerToken: Redacted.Redacted<string>;
	automation: SetupAutomation;
}) =>
	Effect.gen(function* () {
		const user = yield* usersPost({
			name: automation.name,
			role: automation.role ?? DEFAULT_AUTOMATION_ROLE,
			auto_groups: [],
			is_service_user: true,
		});
		const key = yield* usersUserIdTokensPost({
			userId: user.id,
			name: automation.tokenName,
			expires_in: automation.expiresIn ?? DEFAULT_AUTOMATION_EXPIRES_IN,
		});
		const ownerTokens = yield* usersUserIdTokensGet({ userId: ownerId });
		for (const token of ownerTokens.filter(token => token.name === SETUP_TOKEN_NAME)) {
			yield* usersUserIdTokensTokenIdDelete({ userId: ownerId, tokenId: token.id });
		}
		return {
			userId: user.id,
			name: user.name,
			tokenId: key.personal_access_token.id,
			tokenName: key.personal_access_token.name,
			token: Redacted.make(key.plain_token),
			expirationDate: key.personal_access_token.expiration_date,
		} satisfies SetupAutomationAttributes;
	}).pipe(Effect.provideService(Credentials, Effect.succeed({ apiToken: ownerToken, managementUrl: apiBaseUrl })));
