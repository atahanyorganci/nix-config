import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameActionsChangeTtlPostInput {
	idOrName: string;
	ttl: number;
}
export const ZonesIdOrNameActionsChangeTtlPostInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
	ttl: Schema.Number,
}).pipe(
	T.Http({ method: "POST", path: "/zones/{idOrName}/actions/change_ttl" }),
) as unknown as Schema.Codec<ZonesIdOrNameActionsChangeTtlPostInput>;

// Output Schema
export interface ZonesIdOrNameActionsChangeTtlPostOutput {
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
export const ZonesIdOrNameActionsChangeTtlPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNameActionsChangeTtlPostOutput>;

// The operation
/**
 * Change a Zone's Default TTL
 *
 * Changes the default Time To Live (TTL) of a [Zone](#tag/zones).
 * This TTL is used for [RRSets](#tag/zone-rrsets) that do not explicitly define a TTL.
 * Only applicable for [Zones](#tag/zones) in primary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameActionsChangeTtlPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameActionsChangeTtlPostInput,
	outputSchema: ZonesIdOrNameActionsChangeTtlPostOutput,
}));
