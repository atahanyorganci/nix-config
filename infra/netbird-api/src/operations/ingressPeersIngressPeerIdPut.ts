import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IngressPeersIngressPeerIdPutInput {
	ingressPeerId: string;
	enabled: boolean;
	fallback: boolean;
}
export const IngressPeersIngressPeerIdPutInput = /*@__PURE__*/ Schema.Struct({
	ingressPeerId: Schema.String.pipe(T.PathParam()),
	enabled: Schema.Boolean,
	fallback: Schema.Boolean,
}).pipe(
	T.Http({ method: "PUT", path: "/api/ingress/peers/{ingressPeerId}" }),
) as unknown as Schema.Codec<IngressPeersIngressPeerIdPutInput>;

// Output Schema
export interface IngressPeersIngressPeerIdPutOutput {
	id: string;
	peer_id: string;
	ingress_ip: string;
	available_ports: { tcp: number; udp: number };
	enabled: boolean;
	connected: boolean;
	fallback: boolean;
	region: string;
}
export const IngressPeersIngressPeerIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<IngressPeersIngressPeerIdPutOutput>;

// The operation
/**
 * Update a Ingress Peer
 *
 * Update information about an ingress peer
 *
 * @param ingressPeerId - The unique identifier of an ingress peer
 */
export const ingressPeersIngressPeerIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IngressPeersIngressPeerIdPutInput,
	outputSchema: IngressPeersIngressPeerIdPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
