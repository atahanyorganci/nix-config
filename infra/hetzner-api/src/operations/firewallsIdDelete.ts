import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FirewallsIdDeleteInput {
	id: number;
}
export const FirewallsIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/firewalls/{id}" })) as unknown as Schema.Codec<FirewallsIdDeleteInput>;

// Output Schema
export type FirewallsIdDeleteOutput = void;
export const FirewallsIdDeleteOutput = /*@__PURE__*/ Schema.Void as unknown as Schema.Codec<FirewallsIdDeleteOutput>;

// The operation
/**
 * Delete a Firewall
 *
 * Deletes the [Firewall](#tag/firewalls).
 * #### Operation specific errors
 *
 * @param id - ID of the Firewall.
 */
export const firewallsIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: FirewallsIdDeleteInput,
	outputSchema: FirewallsIdDeleteOutput,
}));
