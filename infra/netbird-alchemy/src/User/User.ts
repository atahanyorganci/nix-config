import { usersGet } from "@yorganci/netbird-api/usersGet";
import { usersPost } from "@yorganci/netbird-api/usersPost";
import { usersUserIdDelete } from "@yorganci/netbird-api/usersUserIdDelete";
import { usersUserIdPut } from "@yorganci/netbird-api/usersUserIdPut";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound } from "../errors.ts";
import type * as Redacted from "effect/Redacted";

export interface UserProps {
	/**
	 * Email address. Required for invite (non-service) users. For service
	 * users NetBird may assign one if omitted.
	 */
	email?: string;
	/**
	 * Display name. Used for adoption when email is absent (service users).
	 * If omitted, a unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/**
	 * Role assigned to the user (e.g. `user`, `admin`).
	 *
	 * @default "user"
	 */
	role?: string;
	/**
	 * Group IDs automatically assigned to peers registered by this user.
	 *
	 * @default []
	 */
	autoGroups?: ReadonlyArray<string>;
	/**
	 * When true, creates a service user (API/automation account). Changing
	 * this replaces the user.
	 *
	 * @default true
	 */
	isServiceUser?: boolean;
	/**
	 * Whether the user is blocked from authenticating.
	 *
	 * @default false
	 */
	isBlocked?: boolean;
}

export interface UserAttributes {
	/** UUID of the user assigned by NetBird. */
	userId: string;
	/** Email reported by NetBird. */
	email: string;
	/** Display name reported by NetBird. */
	name: string;
	/** Role reported by NetBird. */
	role: string;
	/** Account status. */
	status: "active" | "invited" | "blocked";
	/** Whether the user is blocked. */
	isBlocked: boolean;
	/** Whether this is a service user. */
	isServiceUser: boolean;
	/** One-time password returned on service-user create (when present). */
	password?: Redacted.Redacted<string>;
}

export type User = Resource<"NetBird.User", UserProps, UserAttributes>;

/**
 * A NetBird management user — regular invite users or service users for
 * automation / API access.
 *
 * @resource
 * @product Users
 * @category NetBird
 * @section Creating a User
 * @example Service user for CI
 * ```typescript
 * const bot = yield* NetBird.User("CiBot", {
 *   name: "ci-bot",
 *   role: "admin",
 *   isServiceUser: true,
 *   autoGroups: [infraPeers.groupId],
 * });
 * ```
 */
export const User = Resource<User>("NetBird.User");

export const isUser = (value: unknown): value is User =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.User";

type ApiUser = {
	id: string;
	email: string;
	name: string;
	role: string;
	status: "active" | "invited" | "blocked";
	auto_groups: ReadonlyArray<string>;
	is_service_user?: boolean;
	is_blocked: boolean;
	password?: Redacted.Redacted<string>;
};

export const UserProvider = () =>
	Provider.succeed(User, {
		stables: ["userId", "email"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				const nextService = news.isServiceUser ?? true;
				const prevService = olds.isServiceUser ?? true;
				if (nextService !== prevService) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.userId) {
				const direct = yield* findUserById(output.userId);
				if (direct) return toAttributes(direct, output.password);
			}
			const email = olds?.email ?? output?.email;
			if (email) {
				const byEmail = yield* findUserByEmail(email);
				if (byEmail) return toAttributes(byEmail, output?.password);
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const byName = yield* findUserByName(name);
			if (!byName) return undefined;
			return toAttributes(byName, output?.password);
		}),
		list: Effect.fn(function* () {
			const all = yield* usersGet({});
			return all.map(u => toAttributes(u));
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as UserProps);
			const name = yield* resolveName(id, props.name);
			const role = props.role ?? "user";
			const autoGroups = props.autoGroups ?? [];
			const isServiceUser = props.isServiceUser ?? true;
			const isBlocked = props.isBlocked ?? false;
			const email = props.email;

			let observed: ApiUser | undefined;
			if (output?.userId) {
				observed = yield* findUserById(output.userId);
			}
			if (!observed && email) {
				observed = yield* findUserByEmail(email);
			}
			if (!observed) {
				observed = yield* findUserByName(name);
			}

			if (!observed) {
				const created = yield* usersPost({
					...(email !== undefined ? { email } : {}),
					name,
					role,
					auto_groups: autoGroups,
					is_service_user: isServiceUser,
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = (email ? yield* findUserByEmail(email) : undefined) ?? (yield* findUserByName(name));
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created);
			}

			const groupsChanged =
				autoGroups.length !== observed.auto_groups.length || autoGroups.some(g => !observed.auto_groups.includes(g));
			const needsUpdate = observed.role !== role || observed.is_blocked !== isBlocked || groupsChanged;

			if (needsUpdate) {
				const updated = yield* usersUserIdPut({
					userId: observed.id,
					role,
					auto_groups: autoGroups,
					is_blocked: isBlocked,
				});
				return toAttributes(updated, output?.password ?? observed.password);
			}

			return toAttributes(observed, output?.password);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFound(usersUserIdDelete({ userId: output.userId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const listUsers = () => usersGet({}).pipe(Effect.catch(() => Effect.succeed([] as UsersList)));

type UsersList = ReadonlyArray<ApiUser>;

const findUserById = (userId: string) => listUsers().pipe(Effect.map(users => users.find(u => u.id === userId)));

const findUserByEmail = (email: string) => listUsers().pipe(Effect.map(users => users.find(u => u.email === email)));

const findUserByName = (name: string) => listUsers().pipe(Effect.map(users => users.find(u => u.name === name)));

const toAttributes = (user: ApiUser, previousPassword?: Redacted.Redacted<string>): UserAttributes => {
	const password = user.password ?? previousPassword;
	const attrs: UserAttributes = {
		userId: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
		status: user.status,
		isBlocked: user.is_blocked,
		isServiceUser: user.is_service_user ?? false,
	};
	if (password) {
		return { ...attrs, password };
	}
	return attrs;
};
