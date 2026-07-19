import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface RoutesRouteIdGetInput {
	routeId: string;
}
export const RoutesRouteIdGetInput = /*@__PURE__*/ Schema.Struct({
	routeId: Schema.String.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/api/routes/{routeId}" })) as unknown as Schema.Codec<RoutesRouteIdGetInput>;

// Output Schema
export interface RoutesRouteIdGetOutput {
	id: string;
	network_type: string;
	description: string;
	network_id: string;
	enabled: boolean;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	network?: string;
	domains?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	groups: ReadonlyArray<string>;
	keep_route: boolean;
	access_control_groups?: ReadonlyArray<string>;
	skip_auto_apply?: boolean;
}
export const RoutesRouteIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	network_type: Schema.String,
	description: Schema.String,
	network_id: Schema.String,
	enabled: Schema.Boolean,
	peer: Schema.optional(Schema.String),
	peer_groups: Schema.optional(Schema.Array(Schema.String)),
	network: Schema.optional(Schema.String),
	domains: Schema.optional(Schema.Array(Schema.String)),
	metric: Schema.Number,
	masquerade: Schema.Boolean,
	groups: Schema.Array(Schema.String),
	keep_route: Schema.Boolean,
	access_control_groups: Schema.optional(Schema.Array(Schema.String)),
	skip_auto_apply: Schema.optional(Schema.Boolean),
}) as unknown as Schema.Codec<RoutesRouteIdGetOutput>;

// The operation
/**
 * Retrieve a Route
 *
 * Get information about a Routes
 *
 * @param routeId - The unique identifier of a route
 */
export const routesRouteIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: RoutesRouteIdGetInput,
	outputSchema: RoutesRouteIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
