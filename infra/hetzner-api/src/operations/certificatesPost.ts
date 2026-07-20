import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface CertificatesPostInput {
	name: string;
	labels?: Record<string, string>;
	type?: "uploaded" | "managed";
	certificate?: string;
	private_key?: string | Redacted.Redacted<string>;
	domain_names?: ReadonlyArray<string>;
}
export const CertificatesPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	type: Schema.optional(Schema.Literals(["uploaded", "managed"])),
	certificate: Schema.optional(Schema.String),
	private_key: Schema.optional(SensitiveString),
	domain_names: Schema.optional(Schema.Array(Schema.String)),
}).pipe(T.Http({ method: "POST", path: "/certificates" })) as unknown as Schema.Codec<CertificatesPostInput>;

// Output Schema
export interface CertificatesPostOutput {
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
	action?: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	} | null;
}
export const CertificatesPostOutput = /*@__PURE__*/ Schema.Struct({
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
	action: Schema.optional(
		Schema.NullOr(
			Schema.Struct({
				id: Schema.Number,
				command: Schema.String,
				status: Schema.Literals(["running", "success", "error"]),
				started: Schema.String,
				finished: Schema.NullOr(Schema.String),
				progress: Schema.Number,
				resources: Schema.Array(
					Schema.Struct({
						id: Schema.Number,
						type: Schema.String,
					}),
				),
				error: Schema.NullOr(
					Schema.Struct({
						code: Schema.String,
						message: Schema.String,
					}),
				),
			}),
		),
	),
}) as unknown as Schema.Codec<CertificatesPostOutput>;

// The operation
/**
 * Create a Certificate
 *
 * Creates a new Certificate.
 * The default type **uploaded** allows for uploading your existing `certificate` and `private_key` in PEM format. You have to monitor its expiration date and handle renewal yourself.
 * In contrast, type **managed** requests a new Certificate from *Let's Encrypt* for the specified `domain_names`. Only domains managed by *Hetzner DNS* are supported. We handle renewal and timely alert the project owner via email if problems occur.
 * For type `managed` Certificates the `action` key of the response contains the Action that allows for tracking the issuance process. For type `uploaded` Certificates the `action` is always null.
 */
export const certificatesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: CertificatesPostInput,
	outputSchema: CertificatesPostOutput,
}));
