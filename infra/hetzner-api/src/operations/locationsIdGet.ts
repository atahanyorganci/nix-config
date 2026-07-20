import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LocationsIdGetInput {
	id: number;
}
export const LocationsIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/locations/{id}" })) as unknown as Schema.Codec<LocationsIdGetInput>;

// Output Schema
export interface LocationsIdGetOutput {
	location: {
		id: number;
		name: string;
		description: string;
		country: string;
		city: string;
		latitude: number;
		longitude: number;
		network_zone: string;
	};
}
export const LocationsIdGetOutput = /*@__PURE__*/ Schema.Struct({
	location: Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		description: Schema.String,
		country: Schema.String,
		city: Schema.String,
		latitude: Schema.Number,
		longitude: Schema.Number,
		network_zone: Schema.String,
	}),
}) as unknown as Schema.Codec<LocationsIdGetOutput>;

// The operation
/**
 * Get a Location
 *
 * Returns a [Location](#tag/locations).
 *
 * @param id - ID of the Location.
 */
export const locationsIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: LocationsIdGetInput,
	outputSchema: LocationsIdGetOutput,
}));
