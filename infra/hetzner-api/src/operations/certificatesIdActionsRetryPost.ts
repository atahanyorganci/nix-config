import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface CertificatesIdActionsRetryPostInput {
	id: number;
}
export const CertificatesIdActionsRetryPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/certificates/{id}/actions/retry" }),
) as unknown as Schema.Codec<CertificatesIdActionsRetryPostInput>;

// Output Schema
export interface CertificatesIdActionsRetryPostOutput {
	action: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	};
}
export const CertificatesIdActionsRetryPostOutput = /*@__PURE__*/ Schema.Struct({
	action: Schema.Struct({
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
}) as unknown as Schema.Codec<CertificatesIdActionsRetryPostOutput>;

// The operation
/**
 * Retry Issuance or Renewal
 *
 * Retry a failed Certificate issuance or renewal.
 * Only applicable if the type of the Certificate is `managed` and the issuance or renewal status is `failed`.
 * #### Operation specific errors
 *
 * @param id - ID of the Certificate.
 */
export const certificatesIdActionsRetryPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: CertificatesIdActionsRetryPostInput,
	outputSchema: CertificatesIdActionsRetryPostOutput,
}));
