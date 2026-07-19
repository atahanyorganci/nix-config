import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdJobsJobIdGetInput {
	peerId: string;
	jobId: string;
}
export const PeersPeerIdJobsJobIdGetInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
	jobId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/peers/{peerId}/jobs/{jobId}" }),
) as unknown as Schema.Codec<PeersPeerIdJobsJobIdGetInput>;

// Output Schema
export interface PeersPeerIdJobsJobIdGetOutput {
	id: string;
	created_at: string;
	completed_at?: string | null;
	triggered_by: string;
	status: "pending" | "succeeded" | "failed";
	failed_reason?: string | null;
	workload: {
		type: "bundle";
		parameters: { bundle_for: boolean; bundle_for_time: number; log_file_count: number; anonymize: boolean };
		result: { upload_key?: string | null };
	};
}
export const PeersPeerIdJobsJobIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	created_at: Schema.String,
	completed_at: Schema.optional(Schema.NullOr(Schema.String)),
	triggered_by: Schema.String,
	status: Schema.Literals(["pending", "succeeded", "failed"]),
	failed_reason: Schema.optional(Schema.NullOr(Schema.String)),
	workload: Schema.Struct({
		type: Schema.Literals(["bundle"]),
		parameters: Schema.Struct({
			bundle_for: Schema.Boolean,
			bundle_for_time: Schema.Number,
			log_file_count: Schema.Number,
			anonymize: Schema.Boolean,
		}),
		result: Schema.Struct({
			upload_key: Schema.optional(Schema.NullOr(Schema.String)),
		}),
	}),
}) as unknown as Schema.Codec<PeersPeerIdJobsJobIdGetOutput>;

// The operation
/**
 * Get Job
 *
 * Retrieve details of a specific job
 *
 * @param peerId - The unique identifier of a peer
 * @param jobId - The unique identifier of a job
 */
export const peersPeerIdJobsJobIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdJobsJobIdGetInput,
	outputSchema: PeersPeerIdJobsJobIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
