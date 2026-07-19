import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersGetInput {
	name?: string;
	ip?: string;
}
export const PeersGetInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.optional(Schema.String),
	ip: Schema.optional(Schema.String),
}).pipe(T.Http({ method: "GET", path: "/api/peers" })) as unknown as Schema.Codec<PeersGetInput>;

// Output Schema
export type PeersGetOutput = ReadonlyArray<{ created_at: string; accessible_peers_count: number }>;
export const PeersGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		created_at: Schema.String,
		accessible_peers_count: Schema.Number,
	}),
) as unknown as Schema.Codec<PeersGetOutput>;

// The operation
/**
 * List all Peers
 *
 * Returns a list of all peers
 *
 * @param name - Filter peers by name
 * @param ip - Filter peers by IP address
 */
export const peersGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersGetInput,
	outputSchema: PeersGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
