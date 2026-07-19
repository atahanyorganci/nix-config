import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LocationsCountriesGetInput {}
export const LocationsCountriesGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/locations/countries" }),
) as unknown as Schema.Codec<LocationsCountriesGetInput>;

// Output Schema
export type LocationsCountriesGetOutput = ReadonlyArray<string>;
export const LocationsCountriesGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.String,
) as unknown as Schema.Codec<LocationsCountriesGetOutput>;

// The operation
/**
 * List all country codes
 *
 * Get list of all country in 2-letter ISO 3166-1 alpha-2 codes
 */
export const locationsCountriesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: LocationsCountriesGetInput,
	outputSchema: LocationsCountriesGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
