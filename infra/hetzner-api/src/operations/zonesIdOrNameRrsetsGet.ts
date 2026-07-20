import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameRrsetsGetInput {
	idOrName: string;
	name?: string;
	type?: ReadonlyArray<
		| "A"
		| "AAAA"
		| "CAA"
		| "CNAME"
		| "DS"
		| "HINFO"
		| "HTTPS"
		| "MX"
		| "NS"
		| "PTR"
		| "RP"
		| "SOA"
		| "SRV"
		| "SVCB"
		| "TLSA"
		| "TXT"
	>;
	labelSelector?: string;
	sort?: ReadonlyArray<
		"id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc" | "created" | "created:asc" | "created:desc"
	>;
	page?: number;
	perPage?: number;
}
export const ZonesIdOrNameRrsetsGetInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
	name: Schema.optional(Schema.String),
	type: Schema.optional(
		Schema.Array(
			Schema.Literals([
				"A",
				"AAAA",
				"CAA",
				"CNAME",
				"DS",
				"HINFO",
				"HTTPS",
				"MX",
				"NS",
				"PTR",
				"RP",
				"SOA",
				"SRV",
				"SVCB",
				"TLSA",
				"TXT",
			]),
		),
	),
	labelSelector: Schema.optional(Schema.String),
	sort: Schema.optional(
		Schema.Array(
			Schema.Literals([
				"id",
				"id:asc",
				"id:desc",
				"name",
				"name:asc",
				"name:desc",
				"created",
				"created:asc",
				"created:desc",
			]),
		),
	),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(
	T.Http({ method: "GET", path: "/zones/{idOrName}/rrsets" }),
) as unknown as Schema.Codec<ZonesIdOrNameRrsetsGetInput>;

// Output Schema
export interface ZonesIdOrNameRrsetsGetOutput {
	rrsets: ReadonlyArray<{
		id: string;
		name: string;
		type:
			| "A"
			| "AAAA"
			| "CAA"
			| "CNAME"
			| "DS"
			| "HINFO"
			| "HTTPS"
			| "MX"
			| "NS"
			| "PTR"
			| "RP"
			| "SOA"
			| "SRV"
			| "SVCB"
			| "TLSA"
			| "TXT";
		ttl: number | null;
		labels: Record<string, string>;
		protection: { change: boolean };
		records: ReadonlyArray<{ value: string; comment?: string }>;
		zone: number;
	}>;
	meta: {
		pagination: {
			page: number;
			per_page: number;
			previous_page: number | null;
			next_page: number | null;
			last_page: number | null;
			total_entries: number | null;
		};
	};
}
export const ZonesIdOrNameRrsetsGetOutput = /*@__PURE__*/ Schema.Struct({
	rrsets: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			name: Schema.String,
			type: Schema.Literals([
				"A",
				"AAAA",
				"CAA",
				"CNAME",
				"DS",
				"HINFO",
				"HTTPS",
				"MX",
				"NS",
				"PTR",
				"RP",
				"SOA",
				"SRV",
				"SVCB",
				"TLSA",
				"TXT",
			]),
			ttl: Schema.NullOr(Schema.Number),
			labels: Schema.Record(Schema.String, Schema.String),
			protection: Schema.Struct({
				change: Schema.Boolean,
			}),
			records: Schema.Array(
				Schema.Struct({
					value: Schema.String,
					comment: Schema.optional(Schema.String),
				}),
			),
			zone: Schema.Number,
		}),
	),
	meta: Schema.Struct({
		pagination: Schema.Struct({
			page: Schema.Number,
			per_page: Schema.Number,
			previous_page: Schema.NullOr(Schema.Number),
			next_page: Schema.NullOr(Schema.Number),
			last_page: Schema.NullOr(Schema.Number),
			total_entries: Schema.NullOr(Schema.Number),
		}),
	}),
}) as unknown as Schema.Codec<ZonesIdOrNameRrsetsGetOutput>;

// The operation
/**
 * List RRSets
 *
 * Returns all [RRSets](#tag/zone-rrsets) in the [Zone](#tag/zones).
 * Use the provided URI parameters to modify the result.
 * The maximum value for `per_page` on this endpoint is `100` instead of `50`.
 * Only applicable for [Zones](#tag/zones) in primary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param type - Filter resources by their type. May be used multiple times.

The response will only contain resources matching the specified types.

 * @param labelSelector - Filter resources by labels.

The response will only contain resources matching the label selector.
For more information, see "[Label Selector](#description/label-selector)".

 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const zonesIdOrNameRrsetsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameRrsetsGetInput,
	outputSchema: ZonesIdOrNameRrsetsGetOutput,
}));
