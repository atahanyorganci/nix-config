import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IngressPeersGetInput {}
export const IngressPeersGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/ingress/peers" }),
) as unknown as Schema.Codec<IngressPeersGetInput>;

// Output Schema
export type IngressPeersGetOutput = ReadonlyArray<{
	id: string;
	peer_id: string;
	ingress_ip: string;
	available_ports: { tcp: number; udp: number };
	enabled: boolean;
	connected: boolean;
	fallback: boolean;
	region: string;
}>;
export const IngressPeersGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<IngressPeersGetOutput>;

// The operation
/**
 * List all Ingress Peers
 *
 * Returns a list of all ingress peers
 */
export const ingressPeersGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IngressPeersGetInput,
	outputSchema: IngressPeersGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
