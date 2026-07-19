import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface SetupKeysPostInput {
	name: string;
	type: string;
	expires_in: number;
	auto_groups: ReadonlyArray<string>;
	usage_limit: number;
	ephemeral?: boolean;
	allow_extra_dns_labels?: boolean;
}
export const SetupKeysPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	type: Schema.String,
	expires_in: Schema.Number,
	auto_groups: Schema.Array(Schema.String),
	usage_limit: Schema.Number,
	ephemeral: Schema.optional(Schema.Boolean),
	allow_extra_dns_labels: Schema.optional(Schema.Boolean),
}).pipe(T.Http({ method: "POST", path: "/api/setup-keys" })) as unknown as Schema.Codec<SetupKeysPostInput>;

// Output Schema
export interface SetupKeysPostOutput {
	id: string;
	name: string;
	expires: string;
	type: string;
	valid: boolean;
	revoked: boolean;
	used_times: number;
	last_used: string;
	state: string;
	auto_groups: ReadonlyArray<string>;
	updated_at: string;
	usage_limit: number;
	ephemeral: boolean;
	allow_extra_dns_labels: boolean;
	key: string;
}
export const SetupKeysPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	expires: Schema.String,
	type: Schema.String,
	valid: Schema.Boolean,
	revoked: Schema.Boolean,
	used_times: Schema.Number,
	last_used: Schema.String,
	state: Schema.String,
	auto_groups: Schema.Array(Schema.String),
	updated_at: Schema.String,
	usage_limit: Schema.Number,
	ephemeral: Schema.Boolean,
	allow_extra_dns_labels: Schema.Boolean,
	key: Schema.String,
}) as unknown as Schema.Codec<SetupKeysPostOutput>;

// The operation
/**
 * Create a Setup Key
 *
 * Creates a setup key
 */
export const setupKeysPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: SetupKeysPostInput,
	outputSchema: SetupKeysPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
