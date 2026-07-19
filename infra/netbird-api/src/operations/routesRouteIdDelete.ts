import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface RoutesRouteIdDeleteInput {
	routeId: string;
}
export const RoutesRouteIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	routeId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/routes/{routeId}" }),
) as unknown as Schema.Codec<RoutesRouteIdDeleteInput>;

// Output Schema
export type RoutesRouteIdDeleteOutput = void;
export const RoutesRouteIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<RoutesRouteIdDeleteOutput>;

// The operation
/**
 * Delete a Route
 *
 * Delete a route
 *
 * @param routeId - The unique identifier of a route
 */
export const routesRouteIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: RoutesRouteIdDeleteInput,
	outputSchema: RoutesRouteIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
