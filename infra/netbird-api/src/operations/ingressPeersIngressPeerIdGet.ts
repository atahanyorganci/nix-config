import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IngressPeersIngressPeerIdGetInput {
	ingressPeerId: string;
}
export const IngressPeersIngressPeerIdGetInput = /*@__PURE__*/ Schema.Struct({
	ingressPeerId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/ingress/peers/{ingressPeerId}" }),
) as unknown as Schema.Codec<IngressPeersIngressPeerIdGetInput>;

// Output Schema
export interface IngressPeersIngressPeerIdGetOutput {
	id: string;
	peer_id: string;
	ingress_ip: string;
	available_ports: { tcp: number; udp: number };
	enabled: boolean;
	connected: boolean;
	fallback: boolean;
	region: string;
}
export const IngressPeersIngressPeerIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	peer_id: Schema.String,
	ingress_ip: Schema.String,
	available_ports: Schema.Struct({
		tcp: Schema.Number,
		udp: Schema.Number,
	}),
	enabled: Schema.Boolean,
	connected: Schema.Boolean,
	fallback: Schema.Boolean,
	region: Schema.String,
}) as unknown as Schema.Codec<IngressPeersIngressPeerIdGetOutput>;

// The operation
/**
 * Retrieve a Ingress Peer
 *
 * Get information about an ingress peer
 *
 * @param ingressPeerId - The unique identifier of an ingress peer
 */
export const ingressPeersIngressPeerIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IngressPeersIngressPeerIdGetInput,
	outputSchema: IngressPeersIngressPeerIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
