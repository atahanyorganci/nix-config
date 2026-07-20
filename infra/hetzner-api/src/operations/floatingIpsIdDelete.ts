import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FloatingIpsIdDeleteInput {
	id: number;
}
export const FloatingIpsIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/floating_ips/{id}" })) as unknown as Schema.Codec<FloatingIpsIdDeleteInput>;

// Output Schema
export type FloatingIpsIdDeleteOutput = void;
export const FloatingIpsIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<FloatingIpsIdDeleteOutput>;

// The operation
/**
 * Delete a Floating IP
 *
 * Deletes a [Floating IP](#tag/floating-ips).
 * If assigned to a [Server](#tag/servers) the [Floating IP](#tag/floating-ips) will be unassigned automatically until 1 May 2026. After this date, the [Floating IP](#tag/floating-ips) needs to be unassigned before it can be deleted.
 * #### Operation specific errors
 *
 * @param id - ID of the Floating IP.
 */
export const floatingIpsIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: FloatingIpsIdDeleteInput,
	outputSchema: FloatingIpsIdDeleteOutput,
}));
