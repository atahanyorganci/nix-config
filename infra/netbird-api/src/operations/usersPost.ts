import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import { SensitiveOutputString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface UsersPostInput {
	email?: string;
	name?: string;
	role: string;
	auto_groups: ReadonlyArray<string>;
	is_service_user: boolean;
}
export const UsersPostInput = /*@__PURE__*/ Schema.Struct({
	email: Schema.optional(Schema.String),
	name: Schema.optional(Schema.String),
	role: Schema.String,
	auto_groups: Schema.Array(Schema.String),
	is_service_user: Schema.Boolean,
}).pipe(T.Http({ method: "POST", path: "/api/users" })) as unknown as Schema.Codec<UsersPostInput>;

// Output Schema
export interface UsersPostOutput {
	id: string;
	email: string;
	password?: Redacted.Redacted<string>;
	name: string;
	role: string;
	status: "active" | "invited" | "blocked";
	last_login?: string;
	auto_groups: ReadonlyArray<string>;
	is_current?: boolean;
	is_service_user?: boolean;
	is_blocked: boolean;
	pending_approval: boolean;
	issued?: string;
	idp_id?: string;
	permissions?: { is_restricted: boolean; modules: Record<string, Record<string, boolean>> };
}
export const UsersPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	email: Schema.String,
	password: Schema.optional(SensitiveOutputString),
	name: Schema.String,
	role: Schema.String,
	status: Schema.Literals(["active", "invited", "blocked"]),
	last_login: Schema.optional(Schema.String),
	auto_groups: Schema.Array(Schema.String),
	is_current: Schema.optional(Schema.Boolean),
	is_service_user: Schema.optional(Schema.Boolean),
	is_blocked: Schema.Boolean,
	pending_approval: Schema.Boolean,
	issued: Schema.optional(Schema.String),
	idp_id: Schema.optional(Schema.String),
	permissions: Schema.optional(
		Schema.Struct({
			is_restricted: Schema.Boolean,
			modules: Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Boolean)),
		}),
	),
}) as unknown as Schema.Codec<UsersPostOutput>;

// The operation
/**
 * Create a User
 *
 * Creates a new service user or sends an invite to a regular user
 */
export const usersPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersPostInput,
	outputSchema: UsersPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
