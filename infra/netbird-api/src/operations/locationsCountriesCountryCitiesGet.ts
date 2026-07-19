import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LocationsCountriesCountryCitiesGetInput {
	country: { country_name: string; country_code: string };
}
export const LocationsCountriesCountryCitiesGetInput = /*@__PURE__*/ Schema.Struct({
	country: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/locations/countries/{country}/cities" }),
) as unknown as Schema.Codec<LocationsCountriesCountryCitiesGetInput>;

// Output Schema
export interface LocationsCountriesCountryCitiesGetOutput {
	geoname_id: number;
	city_name: string;
}
export const LocationsCountriesCountryCitiesGetOutput = /*@__PURE__*/ Schema.Struct({
	geoname_id: Schema.Number,
	city_name: Schema.String,
}) as unknown as Schema.Codec<LocationsCountriesCountryCitiesGetOutput>;

// The operation
/**
 * List all city names by country
 *
 * Get a list of all English city names for a given country code
 */
export const locationsCountriesCountryCitiesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: LocationsCountriesCountryCitiesGetInput,
	outputSchema: LocationsCountriesCountryCitiesGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
