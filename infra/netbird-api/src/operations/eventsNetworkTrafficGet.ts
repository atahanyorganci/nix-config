import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface EventsNetworkTrafficGetInput {
	page?: number;
	page_size?: number;
	user_id?: string;
	reporter_id?: string;
	protocol?: number;
	type?: "TYPE_UNKNOWN" | "TYPE_START" | "TYPE_END" | "TYPE_DROP";
	connection_type?: "P2P" | "ROUTED";
	direction?: "INGRESS" | "EGRESS" | "DIRECTION_UNKNOWN";
	search?: string;
	start_date?: string;
	end_date?: string;
}
export const EventsNetworkTrafficGetInput = /*@__PURE__*/ Schema.Struct({
	page: Schema.optional(Schema.Number),
	page_size: Schema.optional(Schema.Number),
	user_id: Schema.optional(Schema.String),
	reporter_id: Schema.optional(Schema.String),
	protocol: Schema.optional(Schema.Number),
	type: Schema.optional(Schema.Literals(["TYPE_UNKNOWN", "TYPE_START", "TYPE_END", "TYPE_DROP"])),
	connection_type: Schema.optional(Schema.Literals(["P2P", "ROUTED"])),
	direction: Schema.optional(Schema.Literals(["INGRESS", "EGRESS", "DIRECTION_UNKNOWN"])),
	search: Schema.optional(Schema.String),
	start_date: Schema.optional(Schema.String),
	end_date: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "GET", path: "/api/events/network-traffic" }),
) as unknown as Schema.Codec<EventsNetworkTrafficGetInput>;

// Output Schema
export interface EventsNetworkTrafficGetOutput {
	data: ReadonlyArray<{
		flow_id: string;
		reporter_id: string;
		source: {
			id: string;
			type: string;
			name: string;
			geo_location: { city_name: string; country_code: string };
			os: string | null;
			address: string;
			dns_label: string | null;
		};
		destination: {
			id: string;
			type: string;
			name: string;
			geo_location: { city_name: string; country_code: string };
			os: string | null;
			address: string;
			dns_label: string | null;
		};
		user: { id: string; email: string; name: string };
		policy: { id: string; name: string };
		icmp: { type: number; code: number };
		protocol: number;
		direction: string;
		rx_bytes: number;
		rx_packets: number;
		tx_bytes: number;
		tx_packets: number;
		events: ReadonlyArray<{ type: string; timestamp: string }>;
	}>;
	page: number;
	page_size: number;
	total_records: number;
	total_pages: number;
}
export const EventsNetworkTrafficGetOutput = /*@__PURE__*/ Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			flow_id: Schema.String,
			reporter_id: Schema.String,
			source: Schema.Struct({
				id: Schema.String,
				type: Schema.String,
				name: Schema.String,
				geo_location: Schema.Struct({
					city_name: Schema.String,
					country_code: Schema.String,
				}),
				os: Schema.NullOr(Schema.String),
				address: Schema.String,
				dns_label: Schema.NullOr(Schema.String),
			}),
			destination: Schema.Struct({
				id: Schema.String,
				type: Schema.String,
				name: Schema.String,
				geo_location: Schema.Struct({
					city_name: Schema.String,
					country_code: Schema.String,
				}),
				os: Schema.NullOr(Schema.String),
				address: Schema.String,
				dns_label: Schema.NullOr(Schema.String),
			}),
			user: Schema.Struct({
				id: Schema.String,
				email: Schema.String,
				name: Schema.String,
			}),
			policy: Schema.Struct({
				id: Schema.String,
				name: Schema.String,
			}),
			icmp: Schema.Struct({
				type: Schema.Number,
				code: Schema.Number,
			}),
			protocol: Schema.Number,
			direction: Schema.String,
			rx_bytes: Schema.Number,
			rx_packets: Schema.Number,
			tx_bytes: Schema.Number,
			tx_packets: Schema.Number,
			events: Schema.Array(
				Schema.Struct({
					type: Schema.String,
					timestamp: Schema.String,
				}),
			),
		}),
	),
	page: Schema.Number,
	page_size: Schema.Number,
	total_records: Schema.Number,
	total_pages: Schema.Number,
}) as unknown as Schema.Codec<EventsNetworkTrafficGetOutput>;

// The operation
/**
 * List all Traffic Events
 *
 * Returns a list of all network traffic events
 *
 * @param page - Page number
 * @param page_size - Number of items per page
 * @param user_id - Filter by user ID
 * @param reporter_id - Filter by reporter ID
 * @param protocol - Filter by protocol
 * @param type - Filter by event type
 * @param connection_type - Filter by connection type
 * @param direction - Filter by direction
 * @param search - Case-insensitive partial match on user email, source/destination names, and source/destination addresses
 * @param start_date - Start date for filtering events (ISO 8601 format, e.g., 2024-01-01T00:00:00Z).
 * @param end_date - End date for filtering events (ISO 8601 format, e.g., 2024-01-31T23:59:59Z).
 */
export const eventsNetworkTrafficGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: EventsNetworkTrafficGetInput,
	outputSchema: EventsNetworkTrafficGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
