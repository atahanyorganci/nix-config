import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface SetupPostInput {
	email: string;
	password: string | Redacted.Redacted<string>;
	name: string;
	create_pat?: boolean;
	pat_expire_in?: number;
}
export const SetupPostInput = /*@__PURE__*/ Schema.Struct({
	email: Schema.String,
	password: SensitiveString,
	name: Schema.String,
	create_pat: Schema.optional(Schema.Boolean),
	pat_expire_in: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "POST", path: "/api/setup" })) as unknown as Schema.Codec<SetupPostInput>;

// Output Schema
export interface SetupPostOutput {
	user_id: string;
	email: string;
	personal_access_token?: string;
}
export const SetupPostOutput = /*@__PURE__*/ Schema.Struct({
	user_id: Schema.String,
	email: Schema.String,
	personal_access_token: Schema.optional(Schema.String),
}) as unknown as Schema.Codec<SetupPostOutput>;

// The operation
/**
 * Setup Instance
 *
 * Creates the initial admin user for the instance. This endpoint does not require authentication but only works when setup is required (no accounts exist and embedded IDP is enabled).
 * When the management server is started with `NB_SETUP_PAT_ENABLED=true` and the request includes `create_pat: true`, the endpoint also provisions the NetBird account for the new owner user and returns the plain text Personal Access Token in `personal_access_token`. The optional `pat_expire_in` value applies only when `create_pat` is true and defaults to 1 day when omitted. If a post-user step fails, setup-created resources are rolled back when safe; if account cleanup fails, the owner user is left in place to avoid leaving an account without its admin user.
 */
export const setupPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: SetupPostInput,
	outputSchema: SetupPostOutput,
	errors: [BadRequest] as const,
}));
