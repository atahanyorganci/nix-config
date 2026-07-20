import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface CertificatesGetInput {
	sort?: ReadonlyArray<
		"id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc" | "created" | "created:asc" | "created:desc"
	>;
	name?: string;
	labelSelector?: string;
	type?: ReadonlyArray<"uploaded" | "managed">;
	page?: number;
	perPage?: number;
}
export const CertificatesGetInput = /*@__PURE__*/ Schema.Struct({
	sort: Schema.optional(
		Schema.Array(
			Schema.Literals([
				"id",
				"id:asc",
				"id:desc",
				"name",
				"name:asc",
				"name:desc",
				"created",
				"created:asc",
				"created:desc",
			]),
		),
	),
	name: Schema.optional(Schema.String),
	labelSelector: Schema.optional(Schema.String),
	type: Schema.optional(Schema.Array(Schema.Literals(["uploaded", "managed"]))),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/certificates" })) as unknown as Schema.Codec<CertificatesGetInput>;

// Output Schema
export interface CertificatesGetOutput {
	certificates: ReadonlyArray<{
		id: number;
		name: string;
		labels: Record<string, string>;
		type?: "uploaded" | "managed";
		certificate: string | null;
		created: string;
		not_valid_before: string | null;
		not_valid_after: string | null;
		domain_names: ReadonlyArray<string>;
		fingerprint: string | null;
		status?: {
			issuance?: "pending" | "completed" | "failed";
			renewal?: "scheduled" | "pending" | "failed" | "unavailable";
			error?: { code?: string; message?: string } | null;
		} | null;
		used_by: ReadonlyArray<{ id: number; type: string }>;
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
export const CertificatesGetOutput = /*@__PURE__*/ Schema.Struct({
	certificates: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			labels: Schema.Record(Schema.String, Schema.String),
			type: Schema.optional(Schema.Literals(["uploaded", "managed"])),
			certificate: Schema.NullOr(Schema.String),
			created: Schema.String,
			not_valid_before: Schema.NullOr(Schema.String),
			not_valid_after: Schema.NullOr(Schema.String),
			domain_names: Schema.Array(Schema.String),
			fingerprint: Schema.NullOr(Schema.String),
			status: Schema.optional(
				Schema.NullOr(
					Schema.Struct({
						issuance: Schema.optional(Schema.Literals(["pending", "completed", "failed"])),
						renewal: Schema.optional(Schema.Literals(["scheduled", "pending", "failed", "unavailable"])),
						error: Schema.optional(
							Schema.NullOr(
								Schema.Struct({
									code: Schema.optional(Schema.String),
									message: Schema.optional(Schema.String),
								}),
							),
						),
					}),
				),
			),
			used_by: Schema.Array(
				Schema.Struct({
					id: Schema.Number,
					type: Schema.String,
				}),
			),
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
}) as unknown as Schema.Codec<CertificatesGetOutput>;

// The operation
/**
 * List Certificates
 *
 * Returns all Certificate objects.
 *
 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param labelSelector - Filter resources by labels.

The response will only contain resources matching the label selector.
For more information, see "[Label Selector](#description/label-selector)".

 * @param type - Filter resources by type. May be used multiple times.

The response will only contain the resources with the specified type.

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const certificatesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: CertificatesGetInput,
	outputSchema: CertificatesGetOutput,
}));
