import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface CertificatesIdPutInput {
	id: number;
	name?: string;
	labels?: Record<string, string>;
}
export const CertificatesIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	name: Schema.optional(Schema.String),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "PUT", path: "/certificates/{id}" })) as unknown as Schema.Codec<CertificatesIdPutInput>;

// Output Schema
export interface CertificatesIdPutOutput {
	certificate: {
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
	};
}
export const CertificatesIdPutOutput = /*@__PURE__*/ Schema.Struct({
	certificate: Schema.Struct({
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
}) as unknown as Schema.Codec<CertificatesIdPutOutput>;

// The operation
/**
 * Update a Certificate
 *
 * Updates the Certificate properties.
 * Note: if the Certificate object changes during the request, the response will be a “conflict” error.
 *
 * @param id - ID of the Certificate.
 */
export const certificatesIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: CertificatesIdPutInput,
	outputSchema: CertificatesIdPutOutput,
}));
