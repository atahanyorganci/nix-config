import { usersCurrentGet } from "@yorganci/netbird-api/usersCurrentGet";
import { usersUserIdTokensGet } from "@yorganci/netbird-api/usersUserIdTokensGet";
import { usersUserIdTokensPost } from "@yorganci/netbird-api/usersUserIdTokensPost";
import { usersUserIdTokensTokenIdDelete } from "@yorganci/netbird-api/usersUserIdTokensTokenIdDelete";
import { usersUserIdTokensTokenIdGet } from "@yorganci/netbird-api/usersUserIdTokensTokenIdGet";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import { catchNotFound, catchNotFoundOrUnavailable, catchUnavailable } from "../errors.ts";

const DEFAULT_EXPIRES_IN_DAYS = 30;

export interface ApiKeyProps {
	/**
	 * User that owns the token. If omitted, the authenticated caller from
	 * `GET /api/users/current` is used.
	 */
	userId?: string;
	/**
	 * Display name for the token. Used as a stable identifier so the
	 * provider can locate the token by name during adoption / state recovery.
	 * If omitted, a unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/**
	 * Lifetime of the token in days from creation (1–365). Changing this
	 * replaces the token because NetBird does not support token updates.
	 *
	 * @default 30
	 */
	expiresIn?: number;
}

export interface ApiKeyAttributes {
	/** UUID of the token assigned by NetBird. */
	tokenId: string;
	/** UUID of the user that owns the token. */
	userId: string;
	/** Display name reported by NetBird. */
	name: string;
	/** Plaintext token value (only fully available on create). */
	token: Redacted.Redacted<string>;
	/** Expiration timestamp reported by NetBird. */
	expirationDate: string;
	/** Creation timestamp reported by NetBird. */
	createdAt: string;
	/** User ID that created the token. */
	createdBy: string;
	/** Last-used timestamp when reported by NetBird. */
	lastUsed?: string;
}

export type ApiKey = Resource<"NetBird.ApiKey", ApiKeyProps, ApiKeyAttributes>;

/**
 * A NetBird personal access token (API key) scoped to a management user.
 *
 * Immutable identity fields (`userId`, `name`, `expiresIn`) trigger
 * replacement. The plaintext `token` is only returned on create and is
 * preserved in Alchemy state across subsequent reads.
 *
 * @resource
 * @product API Keys
 * @category NetBird
 * @section Creating an API Key
 * @example Token for a service user
 * ```typescript
 * const bot = yield* NetBird.User("CiBot", {
 *   name: "ci-bot",
 *   isServiceUser: true,
 *   role: "admin",
 * });
 *
 * const key = yield* NetBird.ApiKey("CiBotKey", {
 *   userId: bot.userId,
 *   name: "ci-bot-key",
 *   expiresIn: 365,
 * });
 * ```
 */
export const ApiKey = Resource<ApiKey>("NetBird.ApiKey");

export const isApiKey = (value: unknown): value is ApiKey =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.ApiKey";

type ApiToken = {
	id: string;
	name: string;
	expiration_date: string;
	created_by: string;
	created_at: string;
	last_used?: string;
};

export const ApiKeyProvider = () =>
	Provider.succeed(ApiKey, {
		stables: ["tokenId", "name", "userId"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				const userId = news.userId ?? olds.userId;
				const name = news.name ?? olds.name;
				const expiresIn = news.expiresIn ?? olds.expiresIn ?? DEFAULT_EXPIRES_IN_DAYS;
				if (
					(olds.userId ?? undefined) !== (userId ?? undefined) ||
					(olds.name ?? undefined) !== (name ?? undefined) ||
					(olds.expiresIn ?? DEFAULT_EXPIRES_IN_DAYS) !== expiresIn
				) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			return yield* readApiKey({ id, output, olds }).pipe(Effect.catch(() => Effect.succeed(output)));
		}),
		list: Effect.fn(function* () {
			const current = yield* catchUnavailable(usersCurrentGet({}));
			if (!current) return [];
			const tokens = yield* catchUnavailable(usersUserIdTokensGet({ userId: current.id }));
			if (!tokens) return [];
			return tokens.map(token => toAttributes(current.id, token));
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as ApiKeyProps);
			const userId = yield* resolveUserId(props.userId ?? output?.userId);
			if (!userId) {
				return yield* Effect.die("NetBird.ApiKey requires userId when the management API is unavailable");
			}
			const name = yield* resolveName(id, props.name);
			const expiresIn = props.expiresIn ?? DEFAULT_EXPIRES_IN_DAYS;

			let observed: ApiToken | undefined;
			if (output?.tokenId) {
				const direct = yield* catchNotFound(usersUserIdTokensTokenIdGet({ userId, tokenId: output.tokenId }));
				if (direct) observed = direct;
			}
			if (!observed) {
				observed = yield* findTokenByName(userId, name);
			}

			if (!observed) {
				return yield* usersUserIdTokensPost({
					userId,
					name,
					expires_in: expiresIn,
				}).pipe(
					Effect.map(created => toAttributesFromCreate(userId, created)),
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findTokenByName(userId, name);
							if (existing) return toAttributes(userId, existing, output?.token);
							return yield* Effect.fail(err);
						}),
					),
				);
			}

			return toAttributes(userId, observed, output?.token);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFoundOrUnavailable(
				usersUserIdTokensTokenIdDelete({ userId: output.userId, tokenId: output.tokenId }),
			);
		}),
	});

const readApiKey = Effect.fn(function* ({
	id,
	output,
	olds,
}: {
	id: string;
	output: ApiKeyAttributes | undefined;
	olds: ApiKeyProps | undefined;
}) {
	const userId = yield* resolveUserId(olds?.userId ?? output?.userId);
	if (!userId) return output;
	if (output?.tokenId) {
		const direct = yield* catchNotFound(usersUserIdTokensTokenIdGet({ userId, tokenId: output.tokenId }));
		if (direct) {
			return toAttributes(userId, direct, output.token);
		}
	}
	const name = yield* resolveName(id, olds?.name ?? output?.name);
	const existing = yield* findTokenByName(userId, name);
	if (!existing) return undefined;
	return toAttributes(userId, existing, output?.token);
});

const resolveUserId = (preferred?: string) =>
	Effect.gen(function* () {
		if (preferred) return preferred;
		const current = yield* catchUnavailable(usersCurrentGet({}));
		return current?.id;
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findTokenByName = (userId: string, name: string) =>
	usersUserIdTokensGet({ userId }).pipe(
		Effect.map(tokens => tokens.find(token => token.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toAttributes = (userId: string, token: ApiToken, previous?: Redacted.Redacted<string>): ApiKeyAttributes => {
	const attrs: ApiKeyAttributes = {
		tokenId: token.id,
		userId,
		name: token.name,
		token: previous ?? Redacted.make(""),
		expirationDate: token.expiration_date,
		createdAt: token.created_at,
		createdBy: token.created_by,
	};
	if (token.last_used) {
		return { ...attrs, lastUsed: token.last_used };
	}
	return attrs;
};

const toAttributesFromCreate = (
	userId: string,
	created: {
		plain_token: string;
		personal_access_token: ApiToken;
	},
): ApiKeyAttributes => {
	const token = created.personal_access_token;
	const attrs: ApiKeyAttributes = {
		tokenId: token.id,
		userId,
		name: token.name,
		token: Redacted.make(created.plain_token),
		expirationDate: token.expiration_date,
		createdAt: token.created_at,
		createdBy: token.created_by,
	};
	if (token.last_used) {
		return { ...attrs, lastUsed: token.last_used };
	}
	return attrs;
};
