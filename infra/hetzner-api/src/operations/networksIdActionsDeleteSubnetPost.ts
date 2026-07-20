import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksIdActionsDeleteSubnetPostInput {
	id: number;
	ip_range: string;
}
export const NetworksIdActionsDeleteSubnetPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	ip_range: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/networks/{id}/actions/delete_subnet" }),
) as unknown as Schema.Codec<NetworksIdActionsDeleteSubnetPostInput>;

// Output Schema
export interface NetworksIdActionsDeleteSubnetPostOutput {
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
export const NetworksIdActionsDeleteSubnetPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<NetworksIdActionsDeleteSubnetPostOutput>;

// The operation
/**
 * Delete a subnet from a Network
 *
 * Deletes a single subnet entry from a [Network](#tag/networks).
 * Subnets containing attached resources can not be deleted, they must be detached beforehand.
 * If a change is currently being performed on this [Network](#tag/networks), a error response with code `conflict` will be returned.
 *
 * @param id - ID of the Network.
 */
export const networksIdActionsDeleteSubnetPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksIdActionsDeleteSubnetPostInput,
	outputSchema: NetworksIdActionsDeleteSubnetPostOutput,
}));
