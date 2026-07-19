import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdIngressPortsPostInput {
	peerId: string;
	name: string;
	enabled: boolean;
	port_ranges?: ReadonlyArray<{ start: number; end: number; protocol: "tcp" | "udp" | "tcp/udp" }>;
	direct_port?: { count: number; protocol: "tcp" | "udp" | "tcp/udp" };
}
export const PeersPeerIdIngressPortsPostInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	enabled: Schema.Boolean,
	port_ranges: Schema.optional(
		Schema.Array(
			Schema.Struct({
				start: Schema.Number,
				end: Schema.Number,
				protocol: Schema.Literals(["tcp", "udp", "tcp/udp"]),
			}),
		),
	),
	direct_port: Schema.optional(
		Schema.Struct({
			count: Schema.Number,
			protocol: Schema.Literals(["tcp", "udp", "tcp/udp"]),
		}),
	),
}).pipe(
	T.Http({ method: "POST", path: "/api/peers/{peerId}/ingress/ports" }),
) as unknown as Schema.Codec<PeersPeerIdIngressPortsPostInput>;

// Output Schema
export interface PeersPeerIdIngressPortsPostOutput {
	id: string;
	name: string;
	ingress_peer_id: string;
	region: string;
	enabled: boolean;
	ingress_ip: string;
	port_range_mappings: ReadonlyArray<{
		translated_start: number;
		translated_end: number;
		ingress_start: number;
		ingress_end: number;
		protocol: "tcp" | "udp" | "tcp/udp";
	}>;
}
export const PeersPeerIdIngressPortsPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	ingress_peer_id: Schema.String,
	region: Schema.String,
	enabled: Schema.Boolean,
	ingress_ip: Schema.String,
	port_range_mappings: Schema.Array(
		Schema.Struct({
			translated_start: Schema.Number,
			translated_end: Schema.Number,
			ingress_start: Schema.Number,
			ingress_end: Schema.Number,
			protocol: Schema.Literals(["tcp", "udp", "tcp/udp"]),
		}),
	),
}) as unknown as Schema.Codec<PeersPeerIdIngressPortsPostOutput>;

// The operation
/**
 * Create a Port Allocation
 *
 * Creates a new ingress port allocation for a peer
 *
 * @param peerId - The unique identifier of a peer
 */
export const peersPeerIdIngressPortsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdIngressPortsPostInput,
	outputSchema: PeersPeerIdIngressPortsPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
