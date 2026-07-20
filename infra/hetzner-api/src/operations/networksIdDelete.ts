import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksIdDeleteInput {
	id: number;
}
export const NetworksIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/networks/{id}" })) as unknown as Schema.Codec<NetworksIdDeleteInput>;

// Output Schema
export type NetworksIdDeleteOutput = void;
export const NetworksIdDeleteOutput = /*@__PURE__*/ Schema.Void as unknown as Schema.Codec<NetworksIdDeleteOutput>;

// The operation
/**
 * Delete a Network
 *
 * Deletes a [Network](#tag/networks).
 * Attached resources will be detached automatically.
 *
 * @param id - ID of the Network.
 */
export const networksIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksIdDeleteInput,
	outputSchema: NetworksIdDeleteOutput,
}));
