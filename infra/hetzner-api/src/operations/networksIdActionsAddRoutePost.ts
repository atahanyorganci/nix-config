import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksIdActionsAddRoutePostInput {
	id: number;
	destination: string;
	gateway: string;
}
export const NetworksIdActionsAddRoutePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	destination: Schema.String,
	gateway: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/networks/{id}/actions/add_route" }),
) as unknown as Schema.Codec<NetworksIdActionsAddRoutePostInput>;

// Output Schema
export interface NetworksIdActionsAddRoutePostOutput {
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
export const NetworksIdActionsAddRoutePostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<NetworksIdActionsAddRoutePostOutput>;

// The operation
/**
 * Add a route to a Network
 *
 * Adds a route entry to a [Network](#tag/networks).
 * If a change is currently being performed on this [Network](#tag/networks), a error response with code `conflict` will be returned.
 *
 * @param id - ID of the Network.
 */
export const networksIdActionsAddRoutePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksIdActionsAddRoutePostInput,
	outputSchema: NetworksIdActionsAddRoutePostOutput,
}));
