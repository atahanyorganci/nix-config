import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdTemporaryAccessPostInput {
	peerId: string;
	name: string;
	wg_pub_key: string;
	rules: ReadonlyArray<string>;
}
export const PeersPeerIdTemporaryAccessPostInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	wg_pub_key: Schema.String,
	rules: Schema.Array(Schema.String),
}).pipe(
	T.Http({ method: "POST", path: "/api/peers/{peerId}/temporary-access" }),
) as unknown as Schema.Codec<PeersPeerIdTemporaryAccessPostInput>;

// Output Schema
export interface PeersPeerIdTemporaryAccessPostOutput {
	name: string;
	id: string;
	rules: ReadonlyArray<string>;
}
export const PeersPeerIdTemporaryAccessPostOutput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	id: Schema.String,
	rules: Schema.Array(Schema.String),
}) as unknown as Schema.Codec<PeersPeerIdTemporaryAccessPostOutput>;

// The operation
/**
 * Create a Temporary Access Peer
 *
 * Creates a temporary access peer that can be used to access this peer and this peer only. The temporary access peer and its access policies will be automatically deleted after it disconnects.
 *
 * @param peerId - The unique identifier of a peer
 */
export const peersPeerIdTemporaryAccessPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdTemporaryAccessPostInput,
	outputSchema: PeersPeerIdTemporaryAccessPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
