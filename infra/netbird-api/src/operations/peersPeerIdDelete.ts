import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdDeleteInput {
	peerId: string;
}
export const PeersPeerIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/api/peers/{peerId}" })) as unknown as Schema.Codec<PeersPeerIdDeleteInput>;

// Output Schema
export type PeersPeerIdDeleteOutput = void;
export const PeersPeerIdDeleteOutput = /*@__PURE__*/ Schema.Void as unknown as Schema.Codec<PeersPeerIdDeleteOutput>;

// The operation
/**
 * Delete a Peer
 *
 * Delete a peer
 *
 * @param peerId - The unique identifier of a peer
 */
export const peersPeerIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdDeleteInput,
	outputSchema: PeersPeerIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
