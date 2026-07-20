import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface SshKeysIdGetInput {
	id: number;
}
export const SshKeysIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/ssh_keys/{id}" })) as unknown as Schema.Codec<SshKeysIdGetInput>;

// Output Schema
export interface SshKeysIdGetOutput {
	ssh_key: {
		id: number;
		name: string;
		fingerprint: string;
		public_key: string;
		labels: Record<string, string>;
		created: string;
	};
}
export const SshKeysIdGetOutput = /*@__PURE__*/ Schema.Struct({
	ssh_key: Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		fingerprint: Schema.String,
		public_key: Schema.String,
		labels: Schema.Record(Schema.String, Schema.String),
		created: Schema.String,
	}),
}) as unknown as Schema.Codec<SshKeysIdGetOutput>;

// The operation
/**
 * Get a SSH key
 *
 * Returns a specific SSH key object.
 *
 * @param id - ID of the SSH Key.
 */
export const sshKeysIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: SshKeysIdGetInput,
	outputSchema: SshKeysIdGetOutput,
}));
