import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface SetupKeysKeyIdPutInput {
	keyId: string;
	revoked: boolean;
	auto_groups: ReadonlyArray<string>;
}
export const SetupKeysKeyIdPutInput = /*@__PURE__*/ Schema.Struct({
	keyId: Schema.String.pipe(T.PathParam()),
	revoked: Schema.Boolean,
	auto_groups: Schema.Array(Schema.String),
}).pipe(T.Http({ method: "PUT", path: "/api/setup-keys/{keyId}" })) as unknown as Schema.Codec<SetupKeysKeyIdPutInput>;

// Output Schema
export interface SetupKeysKeyIdPutOutput {
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
export const SetupKeysKeyIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<SetupKeysKeyIdPutOutput>;

// The operation
/**
 * Update a Setup Key
 *
 * Update information about a setup key
 *
 * @param keyId - The unique identifier of a setup key
 */
export const setupKeysKeyIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: SetupKeysKeyIdPutInput,
	outputSchema: SetupKeysKeyIdPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
