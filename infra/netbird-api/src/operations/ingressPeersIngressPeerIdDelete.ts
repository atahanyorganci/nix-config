import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IngressPeersIngressPeerIdDeleteInput {
	ingressPeerId: string;
}
export const IngressPeersIngressPeerIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	ingressPeerId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/ingress/peers/{ingressPeerId}" }),
) as unknown as Schema.Codec<IngressPeersIngressPeerIdDeleteInput>;

// Output Schema
export type IngressPeersIngressPeerIdDeleteOutput = void;
export const IngressPeersIngressPeerIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IngressPeersIngressPeerIdDeleteOutput>;

// The operation
/**
 * Delete a Ingress Peer
 *
 * Delete an ingress peer
 *
 * @param ingressPeerId - The unique identifier of an ingress peer
 */
export const ingressPeersIngressPeerIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IngressPeersIngressPeerIdDeleteInput,
	outputSchema: IngressPeersIngressPeerIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
