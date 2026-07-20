import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface SshKeysGetInput {
	sort?: ReadonlyArray<"id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc">;
	name?: string;
	fingerprint?: string;
	labelSelector?: string;
	page?: number;
	perPage?: number;
}
export const SshKeysGetInput = /*@__PURE__*/ Schema.Struct({
	sort: Schema.optional(Schema.Array(Schema.Literals(["id", "id:asc", "id:desc", "name", "name:asc", "name:desc"]))),
	name: Schema.optional(Schema.String),
	fingerprint: Schema.optional(Schema.String),
	labelSelector: Schema.optional(Schema.String),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/ssh_keys" })) as unknown as Schema.Codec<SshKeysGetInput>;

// Output Schema
export interface SshKeysGetOutput {
	ssh_keys: ReadonlyArray<{
		id: number;
		name: string;
		fingerprint: string;
		public_key: string;
		labels: Record<string, string>;
		created: string;
	}>;
	meta: {
		pagination: {
			page: number;
			per_page: number;
			previous_page: number | null;
			next_page: number | null;
			last_page: number | null;
			total_entries: number | null;
		};
	};
}
export const SshKeysGetOutput = /*@__PURE__*/ Schema.Struct({
	ssh_keys: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			fingerprint: Schema.String,
			public_key: Schema.String,
			labels: Schema.Record(Schema.String, Schema.String),
			created: Schema.String,
		}),
	),
	meta: Schema.Struct({
		pagination: Schema.Struct({
			page: Schema.Number,
			per_page: Schema.Number,
			previous_page: Schema.NullOr(Schema.Number),
			next_page: Schema.NullOr(Schema.Number),
			last_page: Schema.NullOr(Schema.Number),
			total_entries: Schema.NullOr(Schema.Number),
		}),
	}),
}) as unknown as Schema.Codec<SshKeysGetOutput>;

// The operation
/**
 * List SSH keys
 *
 * Returns all SSH key objects.
 *
 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param fingerprint - May be used to filter SSH keys by their fingerprint. The response will only contain the SSH key matching the specified fingerprint.
 * @param labelSelector - Filter resources by labels.

The response will only contain resources matching the label selector.
For more information, see "[Label Selector](#description/label-selector)".

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const sshKeysGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: SshKeysGetInput,
	outputSchema: SshKeysGetOutput,
}));
