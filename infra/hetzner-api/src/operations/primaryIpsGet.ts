import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PrimaryIpsGetInput {
	name?: string;
	labelSelector?: string;
	ip?: string;
	page?: number;
	perPage?: number;
	sort?: ReadonlyArray<"id" | "id:asc" | "id:desc" | "created" | "created:asc" | "created:desc">;
}
export const PrimaryIpsGetInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.optional(Schema.String),
	labelSelector: Schema.optional(Schema.String),
	ip: Schema.optional(Schema.String),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
	sort: Schema.optional(
		Schema.Array(Schema.Literals(["id", "id:asc", "id:desc", "created", "created:asc", "created:desc"])),
	),
}).pipe(T.Http({ method: "GET", path: "/primary_ips" })) as unknown as Schema.Codec<PrimaryIpsGetInput>;

// Output Schema
export interface PrimaryIpsGetOutput {
	primary_ips: ReadonlyArray<{
		id: number;
		name: string;
		labels: Record<string, string>;
		created: string;
		blocked: boolean;
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
		ip: string;
		dns_ptr: ReadonlyArray<{ ip: string; dns_ptr: string }>;
		protection: { delete: boolean };
		type: "ipv4" | "ipv6";
		auto_delete: boolean;
		assignee_type: "server";
		assignee_id: number | null;
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
export const PrimaryIpsGetOutput = /*@__PURE__*/ Schema.Struct({
	primary_ips: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			labels: Schema.Record(Schema.String, Schema.String),
			created: Schema.String,
			blocked: Schema.Boolean,
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
			ip: Schema.String,
			dns_ptr: Schema.Array(
				Schema.Struct({
					ip: Schema.String,
					dns_ptr: Schema.String,
				}),
			),
			protection: Schema.Struct({
				delete: Schema.Boolean,
			}),
			type: Schema.Literals(["ipv4", "ipv6"]),
			auto_delete: Schema.Boolean,
			assignee_type: Schema.Literals(["server"]),
			assignee_id: Schema.NullOr(Schema.Number),
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
}) as unknown as Schema.Codec<PrimaryIpsGetOutput>;

// The operation
/**
 * List Primary IPs
 *
 * List multiple [Primary IPs](#tag/primary-ips).
 * Use the provided URI parameters to modify the result.
 *
 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param labelSelector - Filter resources by labels.

The response will only contain resources matching the label selector.
For more information, see "[Label Selector](#description/label-selector)".

 * @param ip - Filter results by IP address.
 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 */
export const primaryIpsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PrimaryIpsGetInput,
	outputSchema: PrimaryIpsGetOutput,
}));
