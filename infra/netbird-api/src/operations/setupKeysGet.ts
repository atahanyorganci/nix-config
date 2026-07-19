import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface SetupKeysGetInput {}
export const SetupKeysGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/setup-keys" }),
) as unknown as Schema.Codec<SetupKeysGetInput>;

// Output Schema
export type SetupKeysGetOutput = ReadonlyArray<{
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
}>;
export const SetupKeysGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<SetupKeysGetOutput>;

// The operation
/**
 * List all Setup Keys
 *
 * Returns a list of all Setup Keys
 */
export const setupKeysGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: SetupKeysGetInput,
	outputSchema: SetupKeysGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
