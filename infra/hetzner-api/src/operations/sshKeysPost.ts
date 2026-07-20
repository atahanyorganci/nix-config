import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface SshKeysPostInput {
	name: string;
	public_key: string;
	labels?: Record<string, string>;
}
export const SshKeysPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	public_key: Schema.String,
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "POST", path: "/ssh_keys" })) as unknown as Schema.Codec<SshKeysPostInput>;

// Output Schema
export interface SshKeysPostOutput {
	ssh_key: {
		id: number;
		name: string;
		fingerprint: string;
		public_key: string;
		labels: Record<string, string>;
		created: string;
	};
}
export const SshKeysPostOutput = /*@__PURE__*/ Schema.Struct({
	ssh_key: Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		fingerprint: Schema.String,
		public_key: Schema.String,
		labels: Schema.Record(Schema.String, Schema.String),
		created: Schema.String,
	}),
}) as unknown as Schema.Codec<SshKeysPostOutput>;

// The operation
/**
 * Create an SSH key
 *
 * Creates a new SSH key with the given `name` and `public_key`. Once an SSH key is created, it can be used in other calls such as creating Servers.
 */
export const sshKeysPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: SshKeysPostInput,
	outputSchema: SshKeysPostOutput,
}));
