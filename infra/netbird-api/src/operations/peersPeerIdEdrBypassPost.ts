import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdEdrBypassPostInput {
	peerId: string;
}
export const PeersPeerIdEdrBypassPostInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/api/peers/{peerId}/edr/bypass" }),
) as unknown as Schema.Codec<PeersPeerIdEdrBypassPostInput>;

// Output Schema
export interface PeersPeerIdEdrBypassPostOutput {
	peer_id: string;
}
export const PeersPeerIdEdrBypassPostOutput = /*@__PURE__*/ Schema.Struct({
	peer_id: Schema.String,
}) as unknown as Schema.Codec<PeersPeerIdEdrBypassPostOutput>;

// The operation
/**
 * Bypass compliance for a non-compliant peer
 *
 * Allows an admin to bypass EDR compliance checks for a specific peer.
 * The peer will remain bypassed until the admin revokes it OR the device becomes
 * naturally compliant in the EDR system.
 *
 * @param peerId - The unique identifier of the peer
 */
export const peersPeerIdEdrBypassPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdEdrBypassPostInput,
	outputSchema: PeersPeerIdEdrBypassPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
