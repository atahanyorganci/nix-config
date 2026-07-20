import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PrimaryIpsIdDeleteInput {
	id: number;
}
export const PrimaryIpsIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/primary_ips/{id}" })) as unknown as Schema.Codec<PrimaryIpsIdDeleteInput>;

// Output Schema
export type PrimaryIpsIdDeleteOutput = void;
export const PrimaryIpsIdDeleteOutput = /*@__PURE__*/ Schema.Void as unknown as Schema.Codec<PrimaryIpsIdDeleteOutput>;

// The operation
/**
 * Delete a Primary IP
 *
 * Deletes a [Primary IP](#tag/primary-ips).
 * The [Server](#tag/servers) must be powered off (status `off`) in order for this operation to succeed.
 * If assigned to a [Server](#tag/servers) the [Primary IP](#tag/primary-ips) will be unassigned automatically until 1 May 2026. After this date, the [Primary IP](#tag/primary-ips) needs to be unassigned before it can be deleted.
 * #### Operation specific errors
 *
 * @param id - ID of the Primary IP.
 */
export const primaryIpsIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: PrimaryIpsIdDeleteInput,
	outputSchema: PrimaryIpsIdDeleteOutput,
}));
