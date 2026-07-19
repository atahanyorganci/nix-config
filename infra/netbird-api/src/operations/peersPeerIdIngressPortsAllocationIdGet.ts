import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdIngressPortsAllocationIdGetInput {
	peerId: string;
	allocationId: string;
}
export const PeersPeerIdIngressPortsAllocationIdGetInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
	allocationId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/peers/{peerId}/ingress/ports/{allocationId}" }),
) as unknown as Schema.Codec<PeersPeerIdIngressPortsAllocationIdGetInput>;

// Output Schema
export interface PeersPeerIdIngressPortsAllocationIdGetOutput {
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
export const PeersPeerIdIngressPortsAllocationIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<PeersPeerIdIngressPortsAllocationIdGetOutput>;

// The operation
/**
 * Retrieve a Port Allocation
 *
 * Get information about an ingress port allocation
 *
 * @param peerId - The unique identifier of a peer
 * @param allocationId - The unique identifier of an ingress port allocation
 */
export const peersPeerIdIngressPortsAllocationIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdIngressPortsAllocationIdGetInput,
	outputSchema: PeersPeerIdIngressPortsAllocationIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
