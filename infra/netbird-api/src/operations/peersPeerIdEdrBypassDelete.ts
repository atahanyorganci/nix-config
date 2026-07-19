import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdEdrBypassDeleteInput {
	peerId: string;
}
export const PeersPeerIdEdrBypassDeleteInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/peers/{peerId}/edr/bypass" }),
) as unknown as Schema.Codec<PeersPeerIdEdrBypassDeleteInput>;

// Output Schema
export type PeersPeerIdEdrBypassDeleteOutput = void;
export const PeersPeerIdEdrBypassDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<PeersPeerIdEdrBypassDeleteOutput>;

// The operation
/**
 * Revoke compliance bypass for a peer
 *
 * Removes the compliance bypass, subjecting the peer to normal EDR validation.
 *
 * @param peerId - The unique identifier of the peer
 */
export const peersPeerIdEdrBypassDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdEdrBypassDeleteInput,
	outputSchema: PeersPeerIdEdrBypassDeleteOutput,
	errors: [Forbidden] as const,
}));
