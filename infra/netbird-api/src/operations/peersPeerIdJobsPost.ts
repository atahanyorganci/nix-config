import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdJobsPostInput {
	peerId: string;
	workload: {
		type: "bundle";
		parameters: { bundle_for: boolean; bundle_for_time: number; log_file_count: number; anonymize: boolean };
	};
}
export const PeersPeerIdJobsPostInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
	workload: Schema.Struct({
		type: Schema.Literals(["bundle"]),
		parameters: Schema.Struct({
			bundle_for: Schema.Boolean,
			bundle_for_time: Schema.Number,
			log_file_count: Schema.Number,
			anonymize: Schema.Boolean,
		}),
	}),
}).pipe(
	T.Http({ method: "POST", path: "/api/peers/{peerId}/jobs" }),
) as unknown as Schema.Codec<PeersPeerIdJobsPostInput>;

// Output Schema
export interface PeersPeerIdJobsPostOutput {
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
export const PeersPeerIdJobsPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<PeersPeerIdJobsPostOutput>;

// The operation
/**
 * Create Job
 *
 * Create a new job for a given peer
 *
 * @param peerId - The unique identifier of a peer
 */
export const peersPeerIdJobsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdJobsPostInput,
	outputSchema: PeersPeerIdJobsPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
