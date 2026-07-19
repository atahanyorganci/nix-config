import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdIngressPortsGetInput {
	peerId: string;
	name?: string;
}
export const PeersPeerIdIngressPortsGetInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
	name: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "GET", path: "/api/peers/{peerId}/ingress/ports" }),
) as unknown as Schema.Codec<PeersPeerIdIngressPortsGetInput>;

// Output Schema
export type PeersPeerIdIngressPortsGetOutput = ReadonlyArray<{
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
}>;
export const PeersPeerIdIngressPortsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<PeersPeerIdIngressPortsGetOutput>;

// The operation
/**
 * List all Port Allocations
 *
 * Returns a list of all ingress port allocations for a peer
 *
 * @param peerId - The unique identifier of a peer
 * @param name - Filters ingress port allocations by name
 */
export const peersPeerIdIngressPortsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdIngressPortsGetInput,
	outputSchema: PeersPeerIdIngressPortsGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
