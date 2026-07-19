import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import { SensitiveOutputString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface UsersCurrentGetInput {}
export const UsersCurrentGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/users/current" }),
) as unknown as Schema.Codec<UsersCurrentGetInput>;

// Output Schema
export interface UsersCurrentGetOutput {
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
export const UsersCurrentGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<UsersCurrentGetOutput>;

// The operation
/**
 * Retrieve current user
 *
 * Get information about the current user
 */
export const usersCurrentGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersCurrentGetInput,
	outputSchema: UsersCurrentGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
