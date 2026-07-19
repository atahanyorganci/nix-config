import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersEdrBypassedGetInput {}
export const PeersEdrBypassedGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/peers/edr/bypassed" }),
) as unknown as Schema.Codec<PeersEdrBypassedGetInput>;

// Output Schema
export type PeersEdrBypassedGetOutput = ReadonlyArray<{ peer_id: string }>;
export const PeersEdrBypassedGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		peer_id: Schema.String,
	}),
) as unknown as Schema.Codec<PeersEdrBypassedGetOutput>;

// The operation
/**
 * List all bypassed peers
 *
 * Returns all peers that have compliance bypassed by an admin.
 */
export const peersEdrBypassedGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersEdrBypassedGetInput,
	outputSchema: PeersEdrBypassedGetOutput,
	errors: [Forbidden] as const,
}));
