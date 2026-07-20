import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameActionsChangePrimaryNameserversPostInput {
	idOrName: string;
	primary_nameservers: ReadonlyArray<{
		address: string;
		port?: number;
		tsig_key?: string;
		tsig_algorithm?: "hmac-md5" | "hmac-sha1" | "hmac-sha256";
	}>;
}
export const ZonesIdOrNameActionsChangePrimaryNameserversPostInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
	primary_nameservers: Schema.Array(
		Schema.Struct({
			address: Schema.String,
			port: Schema.optional(Schema.Number),
			tsig_key: Schema.optional(Schema.String),
			tsig_algorithm: Schema.optional(Schema.Literals(["hmac-md5", "hmac-sha1", "hmac-sha256"])),
		}),
	),
}).pipe(
	T.Http({ method: "POST", path: "/zones/{idOrName}/actions/change_primary_nameservers" }),
) as unknown as Schema.Codec<ZonesIdOrNameActionsChangePrimaryNameserversPostInput>;

// Output Schema
export interface ZonesIdOrNameActionsChangePrimaryNameserversPostOutput {
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
export const ZonesIdOrNameActionsChangePrimaryNameserversPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNameActionsChangePrimaryNameserversPostOutput>;

// The operation
/**
 * Change a Zone's Primary Nameservers
 *
 * Overwrites the primary nameservers of a [Zone](#tag/zones).
 * Only applicable for [Zones](#tag/zones) in secondary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameActionsChangePrimaryNameserversPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameActionsChangePrimaryNameserversPostInput,
	outputSchema: ZonesIdOrNameActionsChangePrimaryNameserversPostOutput,
}));
