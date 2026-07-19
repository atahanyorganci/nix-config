import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IngressPeersPostInput {
	peer_id: string;
	enabled: boolean;
	fallback: boolean;
}
export const IngressPeersPostInput = /*@__PURE__*/ Schema.Struct({
	peer_id: Schema.String,
	enabled: Schema.Boolean,
	fallback: Schema.Boolean,
}).pipe(T.Http({ method: "POST", path: "/api/ingress/peers" })) as unknown as Schema.Codec<IngressPeersPostInput>;

// Output Schema
export interface IngressPeersPostOutput {
	id: string;
	peer_id: string;
	ingress_ip: string;
	available_ports: { tcp: number; udp: number };
	enabled: boolean;
	connected: boolean;
	fallback: boolean;
	region: string;
}
export const IngressPeersPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<IngressPeersPostOutput>;

// The operation
/**
 * Create a Ingress Peer
 *
 * Creates a new ingress peer
 */
export const ingressPeersPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IngressPeersPostInput,
	outputSchema: IngressPeersPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
