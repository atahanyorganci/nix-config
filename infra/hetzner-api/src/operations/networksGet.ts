import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksGetInput {
	sort?: ReadonlyArray<
		"id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc" | "created" | "created:asc" | "created:desc"
	>;
	name?: string;
	labelSelector?: string;
	page?: number;
	perPage?: number;
}
export const NetworksGetInput = /*@__PURE__*/ Schema.Struct({
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
	name: Schema.optional(Schema.String),
	labelSelector: Schema.optional(Schema.String),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/networks" })) as unknown as Schema.Codec<NetworksGetInput>;

// Output Schema
export interface NetworksGetOutput {
	networks: ReadonlyArray<{
		id: number;
		name: string;
		ip_range: string;
		subnets: ReadonlyArray<{
			type: "cloud" | "server" | "vswitch";
			ip_range?: string;
			network_zone: string;
			gateway: string;
			vswitch_id?: number | null;
		}>;
		routes: ReadonlyArray<{ destination: string; gateway: string }>;
		servers: ReadonlyArray<number>;
		load_balancers?: ReadonlyArray<number>;
		protection: { delete: boolean };
		labels: Record<string, string>;
		created: string;
		expose_routes_to_vswitch: boolean;
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
export const NetworksGetOutput = /*@__PURE__*/ Schema.Struct({
	networks: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			ip_range: Schema.String,
			subnets: Schema.Array(
				Schema.Struct({
					type: Schema.Literals(["cloud", "server", "vswitch"]),
					ip_range: Schema.optional(Schema.String),
					network_zone: Schema.String,
					gateway: Schema.String,
					vswitch_id: Schema.optional(Schema.NullOr(Schema.Number)),
				}),
			),
			routes: Schema.Array(
				Schema.Struct({
					destination: Schema.String,
					gateway: Schema.String,
				}),
			),
			servers: Schema.Array(Schema.Number),
			load_balancers: Schema.optional(Schema.Array(Schema.Number)),
			protection: Schema.Struct({
				delete: Schema.Boolean,
			}),
			labels: Schema.Record(Schema.String, Schema.String),
			created: Schema.String,
			expose_routes_to_vswitch: Schema.Boolean,
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
}) as unknown as Schema.Codec<NetworksGetOutput>;

// The operation
/**
 * List Networks
 *
 * List multiple [Networks](#tag/networks).
 * Use the provided URI parameters to modify the result.
 *
 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param labelSelector - Filter resources by labels.

The response will only contain resources matching the label selector.
For more information, see "[Label Selector](#description/label-selector)".

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const networksGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksGetInput,
	outputSchema: NetworksGetOutput,
}));
