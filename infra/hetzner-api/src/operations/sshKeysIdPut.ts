import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface SshKeysIdPutInput {
	id: number;
	name?: string;
	labels?: Record<string, string>;
}
export const SshKeysIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	name: Schema.optional(Schema.String),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "PUT", path: "/ssh_keys/{id}" })) as unknown as Schema.Codec<SshKeysIdPutInput>;

// Output Schema
export interface SshKeysIdPutOutput {
	ssh_key: {
		id: number;
		name: string;
		fingerprint: string;
		public_key: string;
		labels: Record<string, string>;
		created: string;
	};
}
export const SshKeysIdPutOutput = /*@__PURE__*/ Schema.Struct({
	ssh_key: Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		fingerprint: Schema.String,
		public_key: Schema.String,
		labels: Schema.Record(Schema.String, Schema.String),
		created: Schema.String,
	}),
}) as unknown as Schema.Codec<SshKeysIdPutOutput>;

// The operation
/**
 * Update an SSH key
 *
 * Updates an SSH key. You can update an SSH key name and an SSH key labels.
 *
 * @param id - ID of the SSH Key.
 */
export const sshKeysIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: SshKeysIdPutInput,
	outputSchema: SshKeysIdPutOutput,
}));
