import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdIngressPortsAllocationIdDeleteInput {
	peerId: string;
	allocationId: string;
}
export const PeersPeerIdIngressPortsAllocationIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
	allocationId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/peers/{peerId}/ingress/ports/{allocationId}" }),
) as unknown as Schema.Codec<PeersPeerIdIngressPortsAllocationIdDeleteInput>;

// Output Schema
export type PeersPeerIdIngressPortsAllocationIdDeleteOutput = void;
export const PeersPeerIdIngressPortsAllocationIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<PeersPeerIdIngressPortsAllocationIdDeleteOutput>;

// The operation
/**
 * Delete a Port Allocation
 *
 * Delete an ingress port allocation
 *
 * @param peerId - The unique identifier of a peer
 * @param allocationId - The unique identifier of an ingress port allocation
 */
export const peersPeerIdIngressPortsAllocationIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdIngressPortsAllocationIdDeleteInput,
	outputSchema: PeersPeerIdIngressPortsAllocationIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
