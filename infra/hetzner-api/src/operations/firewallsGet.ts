import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FirewallsGetInput {
	sort?: ReadonlyArray<
		"id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc" | "created" | "created:asc" | "created:desc"
	>;
	name?: string;
	labelSelector?: string;
	page?: number;
	perPage?: number;
}
export const FirewallsGetInput = /*@__PURE__*/ Schema.Struct({
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
}).pipe(T.Http({ method: "GET", path: "/firewalls" })) as unknown as Schema.Codec<FirewallsGetInput>;

// Output Schema
export interface FirewallsGetOutput {
	firewalls: ReadonlyArray<{
		id: number;
		name: string;
		labels?: Record<string, string>;
		created: string;
		rules: ReadonlyArray<{
			description?: string | null;
			direction: "in" | "out";
			source_ips: ReadonlyArray<string>;
			destination_ips: ReadonlyArray<string>;
			protocol: "tcp" | "udp" | "icmp" | "esp" | "gre";
			port: string | null;
		}>;
		applied_to: ReadonlyArray<{
			type: "server" | "label_selector";
			server?: { id: number };
			label_selector?: { selector: string };
			applied_to_resources?: ReadonlyArray<{ type?: "server"; server?: { id: number } }>;
		}>;
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
export const FirewallsGetOutput = /*@__PURE__*/ Schema.Struct({
	firewalls: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
			created: Schema.String,
			rules: Schema.Array(
				Schema.Struct({
					description: Schema.optional(Schema.NullOr(Schema.String)),
					direction: Schema.Literals(["in", "out"]),
					source_ips: Schema.Array(Schema.String),
					destination_ips: Schema.Array(Schema.String),
					protocol: Schema.Literals(["tcp", "udp", "icmp", "esp", "gre"]),
					port: Schema.NullOr(Schema.String),
				}),
			),
			applied_to: Schema.Array(
				Schema.Struct({
					type: Schema.Literals(["server", "label_selector"]),
					server: Schema.optional(
						Schema.Struct({
							id: Schema.Number,
						}),
					),
					label_selector: Schema.optional(
						Schema.Struct({
							selector: Schema.String,
						}),
					),
					applied_to_resources: Schema.optional(
						Schema.Array(
							Schema.Struct({
								type: Schema.optional(Schema.Literals(["server"])),
								server: Schema.optional(
									Schema.Struct({
										id: Schema.Number,
									}),
								),
							}),
						),
					),
				}),
			),
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
}) as unknown as Schema.Codec<FirewallsGetOutput>;

// The operation
/**
 * List Firewalls
 *
 * Returns all [Firewalls](#tag/firewalls).
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
export const firewallsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: FirewallsGetInput,
	outputSchema: FirewallsGetOutput,
}));
