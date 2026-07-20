import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksIdActionsChangeIpRangePostInput {
	id: number;
	ip_range: string;
}
export const NetworksIdActionsChangeIpRangePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	ip_range: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/networks/{id}/actions/change_ip_range" }),
) as unknown as Schema.Codec<NetworksIdActionsChangeIpRangePostInput>;

// Output Schema
export interface NetworksIdActionsChangeIpRangePostOutput {
	action: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	};
}
export const NetworksIdActionsChangeIpRangePostOutput = /*@__PURE__*/ Schema.Struct({
	action: Schema.Struct({
		id: Schema.Number,
		command: Schema.String,
		status: Schema.Literals(["running", "success", "error"]),
		started: Schema.String,
		finished: Schema.NullOr(Schema.String),
		progress: Schema.Number,
		resources: Schema.Array(
			Schema.Struct({
				id: Schema.Number,
				type: Schema.String,
			}),
		),
		error: Schema.NullOr(
			Schema.Struct({
				code: Schema.String,
				message: Schema.String,
			}),
		),
	}),
}) as unknown as Schema.Codec<NetworksIdActionsChangeIpRangePostOutput>;

// The operation
/**
 * Change IP range of a Network
 *
 * Changes the IP range of a [Network](#tag/networks).
 * The following restrictions apply to changing the IP range:
 * - IP ranges can only be extended and never shrunk.
 * - IPs can only be added to the end of the existing range, therefore only the netmask is allowed to be changed.
 * To update the routes on the connected [Servers](#tag/servers), they need to be rebooted or the routes to be updated manually.
 * For example if the [Network](#tag/networks) has a range of `10.0.0.0/16` to extend it the new range has to start with the IP `10.0.0.0` as well. The netmask `/16` can be changed to a smaller one then `16` therefore increasing the IP range. A valid entry would be `10.0.0.0/15`, `10.0.0.0/14` or `10.0.0.0/13` and so on.
 * If a change is currently being performed on this [Network](#tag/networks), a error response with code `conflict` will be returned.
 *
 * @param id - ID of the Network.
 */
export const networksIdActionsChangeIpRangePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksIdActionsChangeIpRangePostInput,
	outputSchema: NetworksIdActionsChangeIpRangePostOutput,
}));
