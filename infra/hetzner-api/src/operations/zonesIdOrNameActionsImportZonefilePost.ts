import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameActionsImportZonefilePostInput {
	idOrName: string;
	zonefile: string;
}
export const ZonesIdOrNameActionsImportZonefilePostInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
	zonefile: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/zones/{idOrName}/actions/import_zonefile" }),
) as unknown as Schema.Codec<ZonesIdOrNameActionsImportZonefilePostInput>;

// Output Schema
export interface ZonesIdOrNameActionsImportZonefilePostOutput {
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
export const ZonesIdOrNameActionsImportZonefilePostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNameActionsImportZonefilePostOutput>;

// The operation
/**
 * Import a Zone file
 *
 * Imports a zone file, replacing all resource record sets ([RRSets](#tag/zone-rrsets)).
 * The import will fail if existing [RRSet](#tag/zone-rrsets) are `change` protected.
 * See [Zone file import](#tag/zones/zone-file-import) for more details.
 * Only applicable for [Zones](#tag/zones) in primary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameActionsImportZonefilePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameActionsImportZonefilePostInput,
	outputSchema: ZonesIdOrNameActionsImportZonefilePostOutput,
}));
