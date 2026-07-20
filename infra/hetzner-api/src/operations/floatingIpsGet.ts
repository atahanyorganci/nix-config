import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FloatingIpsGetInput {
	name?: string;
	labelSelector?: string;
	sort?: ReadonlyArray<"id" | "id:asc" | "id:desc" | "created" | "created:asc" | "created:desc">;
	page?: number;
	perPage?: number;
}
export const FloatingIpsGetInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.optional(Schema.String),
	labelSelector: Schema.optional(Schema.String),
	sort: Schema.optional(
		Schema.Array(Schema.Literals(["id", "id:asc", "id:desc", "created", "created:asc", "created:desc"])),
	),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/floating_ips" })) as unknown as Schema.Codec<FloatingIpsGetInput>;

// Output Schema
export interface FloatingIpsGetOutput {
	floating_ips: ReadonlyArray<{
		id: number;
		name: string;
		description: string | null;
		ip: string;
		type: "ipv4" | "ipv6";
		server: number | null;
		dns_ptr: ReadonlyArray<{ ip: string; dns_ptr: string }>;
		home_location: {
			id: number;
			name: string;
			description: string;
			country: string;
			city: string;
			latitude: number;
			longitude: number;
			network_zone: string;
		};
		blocked: boolean;
		protection: { delete: boolean };
		labels: Record<string, string>;
		created: string;
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
export const FloatingIpsGetOutput = /*@__PURE__*/ Schema.Struct({
	floating_ips: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			description: Schema.NullOr(Schema.String),
			ip: Schema.String,
			type: Schema.Literals(["ipv4", "ipv6"]),
			server: Schema.NullOr(Schema.Number),
			dns_ptr: Schema.Array(
				Schema.Struct({
					ip: Schema.String,
					dns_ptr: Schema.String,
				}),
			),
			home_location: Schema.Struct({
				id: Schema.Number,
				name: Schema.String,
				description: Schema.String,
				country: Schema.String,
				city: Schema.String,
				latitude: Schema.Number,
				longitude: Schema.Number,
				network_zone: Schema.String,
			}),
			blocked: Schema.Boolean,
			protection: Schema.Struct({
				delete: Schema.Boolean,
			}),
			labels: Schema.Record(Schema.String, Schema.String),
			created: Schema.String,
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
}) as unknown as Schema.Codec<FloatingIpsGetOutput>;

// The operation
/**
 * List Floating IPs
 *
 * List multiple [Floating IPs](#tag/floating-ips).
 * Use the provided URI parameters to modify the result.
 *
 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param labelSelector - Filter resources by labels.

The response will only contain resources matching the label selector.
For more information, see "[Label Selector](#description/label-selector)".

 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const floatingIpsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: FloatingIpsGetInput,
	outputSchema: FloatingIpsGetOutput,
}));
