import * as ps from "@distilled.cloud/planetscale";
import { isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";
import { Client } from "pg";

export interface AppDatabaseProps {
	/** PlanetScale organization of the cluster. */
	organization: string;
	/** PlanetScale database (the cluster) holding the logical database. */
	database: string;
	/** Branch of the cluster. */
	branch: string;
	/** The logical database: lowercase letters, digits and underscores. */
	name: string;
	/**
	 * The app's role, by its name inside Postgres: the part of its username
	 * before the branch id (`<role>.<branch-id>`), not its dashboard name.
	 */
	role: string;
}

export interface AppDatabaseAttributes {
	organization: string;
	database: string;
	branch: string;
	name: string;
	role: string;
}

export interface AppDatabase extends Resource<"Postgres.AppDatabase", AppDatabaseProps, AppDatabaseAttributes> {}

/**
 * A logical database in a PlanetScale Postgres cluster that one role alone can
 * reach.
 *
 * Postgres lets every role connect to a new database, and PlanetScale's API
 * creates roles but not databases or grants. So the database is made, and its
 * access set, in SQL: owned by `postgres`, since a role from the API cannot be
 * made an owner by anything short of a superuser; closed to `PUBLIC`; and open
 * to the role, which can create objects in its `public` schema. The default
 * `postgres` database is closed to `PUBLIC` too, so the role reaches nothing
 * else. Roles inheriting `postgres` (the dashboard's default role, Alchemy's
 * migration roles) keep their access through its ownership.
 *
 * Every deploy re-applies the grants, so it repairs drift; `--force` makes it
 * run when nothing changed. A role that is replaced loses its grants when
 * PlanetScale deletes it. Deleting the resource leaves the database and its
 * data in place.
 */
export const AppDatabase = Resource<AppDatabase>("Postgres.AppDatabase");

export class AppDatabaseError extends Data.TaggedError("Postgres.AppDatabaseError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

/** Long enough for the grants; bounds how long a role whose delete failed lingers. */
const ADMIN_ROLE_TTL_SECONDS = 600;

const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;

type Target = Pick<AppDatabaseProps, "organization" | "database" | "branch">;

interface Admin {
	readonly id: string;
	readonly host: string;
	readonly username: string;
	readonly password: Redacted.Redacted<string>;
}

/**
 * Runs `use` with a role inheriting `postgres`, made for it and deleted after
 * it, the way Alchemy runs a PlanetScale database's migrations. No admin
 * credential is kept in state.
 *
 * Left unnamed, as Alchemy's are, so PlanetScale gives each a unique name:
 * role names are unique per branch, app databases reconcile concurrently, and
 * a role whose delete failed keeps its name until its TTL runs out. The branch
 * is copied field by field: callers pass the whole props, and spreading them
 * would send the app's `name`, which its own role already has.
 */
const withAdminRole = <A, E, R>(target: Target, use: (admin: Admin) => Effect.Effect<A, E, R>) => {
	const branch = { organization: target.organization, database: target.database, branch: target.branch };
	const acquire = Effect.gen(function* () {
		const role = yield* ps.createRole({
			...branch,
			ttl: ADMIN_ROLE_TTL_SECONDS,
			inherited_roles: ["postgres"],
		});
		if (role.password == null) {
			return yield* Effect.die(`PlanetScale returned no password for admin role ${role.id}`);
		}
		return {
			id: role.id,
			host: role.access_host_url,
			username: role.username,
			password: role.password,
		} satisfies Admin;
	});
	const release = (admin: Admin) =>
		ps.deleteRole({ ...branch, id: admin.id, successor: "postgres" }).pipe(
			Effect.asVoid,
			Effect.catchTag("NotFound", () => Effect.void),
			Effect.retry({ schedule: Schedule.max([Schedule.exponential("500 millis"), Schedule.recurs(5)]) }),
			// The grants are in; its TTL removes a role whose delete keeps failing.
			Effect.catch(cause =>
				Effect.logWarning(
					`could not delete admin role ${admin.id}; it expires within ${ADMIN_ROLE_TTL_SECONDS}s`,
					cause,
				),
			),
		);
	return Effect.acquireUseRelease(acquire, use, release);
};

/**
 * Connects as the admin role, acting as `postgres` (`SET ROLE`): the role
 * inherits `postgres`'s privileges but not its CREATEDB attribute, and what it
 * created or granted would otherwise hang off a role about to be deleted.
 * A role PlanetScale has just made can take a moment to accept logins, so a
 * failure is retried; every statement is safe to repeat.
 */
const withClient = <A>(admin: Admin, database: string, use: (client: Client) => Promise<A>) =>
	Effect.tryPromise({
		try: async () => {
			const client = new Client({
				host: admin.host,
				port: 5432,
				user: admin.username,
				password: Redacted.value(admin.password),
				database,
				ssl: { rejectUnauthorized: true, servername: admin.host },
			});
			await client.connect();
			try {
				await client.query("SET ROLE postgres");
				return await use(client);
			} finally {
				await client.end().catch(() => {});
			}
		},
		catch: cause =>
			new AppDatabaseError({
				message: `${database}: ${cause instanceof Error ? cause.message : String(cause)}`,
				cause,
			}),
	}).pipe(Effect.retry({ schedule: Schedule.max([Schedule.exponential("1 second"), Schedule.recurs(4)]) }));

const roleExists = async (client: Client, role: string) =>
	((await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role])).rowCount ?? 0) > 0;

export const AppDatabaseProvider = () =>
	Provider.succeed(AppDatabase, {
		stables: ["organization", "database", "branch", "name"],
		diff: ({ news, output }) =>
			Effect.sync(() => {
				if (!output || !isResolved(news)) return undefined;
				// Another database: make it, and leave the old one and its data alone.
				if (
					news.name !== output.name ||
					news.organization !== output.organization ||
					news.database !== output.database ||
					news.branch !== output.branch
				) {
					return { action: "replace" } as const;
				}
				// Anything else (the role) is an update: the default prop comparison.
				return undefined;
			}),
		reconcile: Effect.fn(function* ({ news, output }) {
			for (const [what, value] of [
				["name", news.name],
				["role", news.role],
			] as const) {
				if (!IDENTIFIER.test(value)) {
					return yield* new AppDatabaseError({ message: `${what} "${value}" is not a plain Postgres identifier` });
				}
			}
			// A role swapped for one that stays (not one PlanetScale deletes) loses access here.
			const previous = output !== undefined && output.role !== news.role ? output.role : undefined;

			yield* withAdminRole(news, admin =>
				Effect.gen(function* () {
					yield* withClient(admin, "postgres", async client => {
						const db = client.escapeIdentifier(news.name);
						const role = client.escapeIdentifier(news.role);
						const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [news.name]);
						if (!rowCount) {
							// template0, as PlanetScale's own guide does: nothing added to template1 is copied in.
							await client.query(`CREATE DATABASE ${db} TEMPLATE template0 ENCODING 'UTF8'`);
						}
						await client.query(`REVOKE ALL ON DATABASE ${db} FROM PUBLIC`);
						await client.query(`GRANT CONNECT, TEMPORARY ON DATABASE ${db} TO ${role}`);
						await client.query("REVOKE ALL ON DATABASE postgres FROM PUBLIC");
						if (previous !== undefined && (await roleExists(client, previous))) {
							await client.query(`REVOKE ALL ON DATABASE ${db} FROM ${client.escapeIdentifier(previous)}`);
						}
					});
					// The schema belongs to the database's owner (`pg_database_owner`), so
					// tables the role creates are its own.
					yield* withClient(admin, news.name, async client => {
						await client.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${client.escapeIdentifier(news.role)}`);
						if (previous !== undefined && (await roleExists(client, previous))) {
							await client.query(`REVOKE ALL ON SCHEMA public FROM ${client.escapeIdentifier(previous)}`);
						}
					});
				}),
			);

			return {
				organization: news.organization,
				database: news.database,
				branch: news.branch,
				name: news.name,
				role: news.role,
			} satisfies AppDatabaseAttributes;
		}),
		// The data outlives the stack, as the cluster's does.
		delete: () => Effect.void,
	});
