import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface EventsProxyGetInput {
	page?: number;
	page_size?: number;
	sort_by?:
		| "timestamp"
		| "url"
		| "host"
		| "path"
		| "method"
		| "status_code"
		| "duration"
		| "source_ip"
		| "user_id"
		| "auth_method"
		| "reason";
	sort_order?: "asc" | "desc";
	search?: string;
	source_ip?: string;
	host?: string;
	path?: string;
	user_id?: string;
	user_email?: string;
	user_name?: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
	status?: "success" | "failed";
	status_code?: number;
	start_date?: string;
	end_date?: string;
}
export const EventsProxyGetInput = /*@__PURE__*/ Schema.Struct({
	page: Schema.optional(Schema.Number),
	page_size: Schema.optional(Schema.Number),
	sort_by: Schema.optional(
		Schema.Literals([
			"timestamp",
			"url",
			"host",
			"path",
			"method",
			"status_code",
			"duration",
			"source_ip",
			"user_id",
			"auth_method",
			"reason",
		]),
	),
	sort_order: Schema.optional(Schema.Literals(["asc", "desc"])),
	search: Schema.optional(Schema.String),
	source_ip: Schema.optional(Schema.String),
	host: Schema.optional(Schema.String),
	path: Schema.optional(Schema.String),
	user_id: Schema.optional(Schema.String),
	user_email: Schema.optional(Schema.String),
	user_name: Schema.optional(Schema.String),
	method: Schema.optional(Schema.Literals(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])),
	status: Schema.optional(Schema.Literals(["success", "failed"])),
	status_code: Schema.optional(Schema.Number),
	start_date: Schema.optional(Schema.String),
	end_date: Schema.optional(Schema.String),
}).pipe(T.Http({ method: "GET", path: "/api/events/proxy" })) as unknown as Schema.Codec<EventsProxyGetInput>;

// Output Schema
export interface EventsProxyGetOutput {
	data: ReadonlyArray<{
		id: string;
		service_id: string;
		timestamp: string;
		method: string;
		host: string;
		path: string;
		duration_ms: number;
		status_code: number;
		source_ip?: string;
		reason?: string;
		user_id?: string;
		auth_method_used?: string;
		country_code?: string;
		city_name?: string;
		subdivision_code?: string;
		bytes_upload: number;
		bytes_download: number;
		protocol?: string;
		metadata?: Record<string, string>;
	}>;
	page: number;
	page_size: number;
	total_records: number;
	total_pages: number;
}
export const EventsProxyGetOutput = /*@__PURE__*/ Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			service_id: Schema.String,
			timestamp: Schema.String,
			method: Schema.String,
			host: Schema.String,
			path: Schema.String,
			duration_ms: Schema.Number,
			status_code: Schema.Number,
			source_ip: Schema.optional(Schema.String),
			reason: Schema.optional(Schema.String),
			user_id: Schema.optional(Schema.String),
			auth_method_used: Schema.optional(Schema.String),
			country_code: Schema.optional(Schema.String),
			city_name: Schema.optional(Schema.String),
			subdivision_code: Schema.optional(Schema.String),
			bytes_upload: Schema.Number,
			bytes_download: Schema.Number,
			protocol: Schema.optional(Schema.String),
			metadata: Schema.optional(Schema.Record(Schema.String, Schema.String)),
		}),
	),
	page: Schema.Number,
	page_size: Schema.Number,
	total_records: Schema.Number,
	total_pages: Schema.Number,
}) as unknown as Schema.Codec<EventsProxyGetOutput>;

// The operation
/**
 * List all Reverse Proxy Access Logs
 *
 * Returns a paginated list of all reverse proxy access log entries
 *
 * @param page - Page number for pagination (1-indexed)
 * @param page_size - Number of items per page (max 100)
 * @param sort_by - Field to sort by (url sorts by host then path)
 * @param sort_order - Sort order (ascending or descending)
 * @param search - General search across request ID, host, path, source IP, user email, and user name
 * @param source_ip - Filter by source IP address
 * @param host - Filter by host header
 * @param path - Filter by request path (supports partial matching)
 * @param user_id - Filter by authenticated user ID
 * @param user_email - Filter by user email (partial matching)
 * @param user_name - Filter by user name (partial matching)
 * @param method - Filter by HTTP method
 * @param status - Filter by status (success = 2xx/3xx, failed = 1xx/4xx/5xx)
 * @param status_code - Filter by HTTP status code
 * @param start_date - Filter by timestamp >= start_date (RFC3339 format)
 * @param end_date - Filter by timestamp <= end_date (RFC3339 format)
 */
export const eventsProxyGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: EventsProxyGetInput,
	outputSchema: EventsProxyGetOutput,
	errors: [Forbidden] as const,
}));
