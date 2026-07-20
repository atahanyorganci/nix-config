import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface CertificatesIdGetInput {
	id: number;
}
export const CertificatesIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/certificates/{id}" })) as unknown as Schema.Codec<CertificatesIdGetInput>;

// Output Schema
export interface CertificatesIdGetOutput {
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
export const CertificatesIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<CertificatesIdGetOutput>;

// The operation
/**
 * Get a Certificate
 *
 * Gets a specific Certificate object.
 *
 * @param id - ID of the Certificate.
 */
export const certificatesIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: CertificatesIdGetInput,
	outputSchema: CertificatesIdGetOutput,
}));
