import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdAccessiblePeersGetInput {
	peerId: string;
}
export const PeersPeerIdAccessiblePeersGetInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/peers/{peerId}/accessible-peers" }),
) as unknown as Schema.Codec<PeersPeerIdAccessiblePeersGetInput>;

// Output Schema
export type PeersPeerIdAccessiblePeersGetOutput = ReadonlyArray<{
	id: string;
	name: string;
	ip: string;
	ipv6?: string;
	dns_label: string;
	user_id: string;
	os: string;
	country_code: string;
	city_name: string;
	geoname_id: number;
	connected: boolean;
	last_seen: string;
}>;
export const PeersPeerIdAccessiblePeersGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		ip: Schema.String,
		ipv6: Schema.optional(Schema.String),
		dns_label: Schema.String,
		user_id: Schema.String,
		os: Schema.String,
		country_code: Schema.String,
		city_name: Schema.String,
		geoname_id: Schema.Number,
		connected: Schema.Boolean,
		last_seen: Schema.String,
	}),
) as unknown as Schema.Codec<PeersPeerIdAccessiblePeersGetOutput>;

// The operation
/**
 * List accessible Peers
 *
 * Returns a list of peers that the specified peer can connect to within the network.
 *
 * @param peerId - The unique identifier of a peer
 */
export const peersPeerIdAccessiblePeersGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdAccessiblePeersGetInput,
	outputSchema: PeersPeerIdAccessiblePeersGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
