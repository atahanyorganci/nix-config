import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesGetInput {
	name?: string;
	mode?: "primary" | "secondary";
	labelSelector?: string;
	sort?: ReadonlyArray<
		"id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc" | "created" | "created:asc" | "created:desc"
	>;
	page?: number;
	perPage?: number;
}
export const ZonesGetInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.optional(Schema.String),
	mode: Schema.optional(Schema.Literals(["primary", "secondary"])),
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
}).pipe(T.Http({ method: "GET", path: "/zones" })) as unknown as Schema.Codec<ZonesGetInput>;

// Output Schema
export interface ZonesGetOutput {
	zones: ReadonlyArray<
		| {
				id: number;
				name: string;
				created: string;
				primary_nameservers?: ReadonlyArray<{
					address: string;
					port?: number;
					tsig_key?: string;
					tsig_algorithm?: "hmac-md5" | "hmac-sha1" | "hmac-sha256";
				}>;
				labels: Record<string, string>;
				protection: { delete: boolean };
				ttl: number;
				status: "ok" | "updating" | "error";
				record_count: number;
				authoritative_nameservers: {
					assigned: ReadonlyArray<string>;
					delegated: ReadonlyArray<string>;
					delegation_last_check: string | null;
					delegation_status?: "valid" | "partially-valid" | "invalid" | "lame" | "unregistered" | "unknown";
				};
				registrar: "hetzner" | "other" | "unknown";
				mode: "primary";
		  }
		| {
				id: number;
				name: string;
				created: string;
				primary_nameservers?: ReadonlyArray<{
					address: string;
					port?: number;
					tsig_key?: string;
					tsig_algorithm?: "hmac-md5" | "hmac-sha1" | "hmac-sha256";
				}>;
				labels: Record<string, string>;
				protection: { delete: boolean };
				ttl: number;
				status: "ok" | "updating" | "error";
				record_count: number;
				authoritative_nameservers: {
					assigned: ReadonlyArray<string>;
					delegated: ReadonlyArray<string>;
					delegation_last_check: string | null;
					delegation_status?: "valid" | "partially-valid" | "invalid" | "lame" | "unregistered" | "unknown";
				};
				registrar: "hetzner" | "other" | "unknown";
				mode: "secondary";
		  }
	>;
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
export const ZonesGetOutput = /*@__PURE__*/ Schema.Struct({
	zones: Schema.Array(
		Schema.Union([
			Schema.Struct({
				id: Schema.Number,
				name: Schema.String,
				created: Schema.String,
				primary_nameservers: Schema.optional(
					Schema.Array(
						Schema.Struct({
							address: Schema.String,
							port: Schema.optional(Schema.Number),
							tsig_key: Schema.optional(Schema.String),
							tsig_algorithm: Schema.optional(Schema.Literals(["hmac-md5", "hmac-sha1", "hmac-sha256"])),
						}),
					),
				),
				labels: Schema.Record(Schema.String, Schema.String),
				protection: Schema.Struct({
					delete: Schema.Boolean,
				}),
				ttl: Schema.Number,
				status: Schema.Literals(["ok", "updating", "error"]),
				record_count: Schema.Number,
				authoritative_nameservers: Schema.Struct({
					assigned: Schema.Array(Schema.String),
					delegated: Schema.Array(Schema.String),
					delegation_last_check: Schema.NullOr(Schema.String),
					delegation_status: Schema.optional(
						Schema.Literals(["valid", "partially-valid", "invalid", "lame", "unregistered", "unknown"]),
					),
				}),
				registrar: Schema.Literals(["hetzner", "other", "unknown"]),
				mode: Schema.Literals(["primary"]),
			}),
			Schema.Struct({
				id: Schema.Number,
				name: Schema.String,
				created: Schema.String,
				primary_nameservers: Schema.optional(
					Schema.Array(
						Schema.Struct({
							address: Schema.String,
							port: Schema.optional(Schema.Number),
							tsig_key: Schema.optional(Schema.String),
							tsig_algorithm: Schema.optional(Schema.Literals(["hmac-md5", "hmac-sha1", "hmac-sha256"])),
						}),
					),
				),
				labels: Schema.Record(Schema.String, Schema.String),
				protection: Schema.Struct({
					delete: Schema.Boolean,
				}),
				ttl: Schema.Number,
				status: Schema.Literals(["ok", "updating", "error"]),
				record_count: Schema.Number,
				authoritative_nameservers: Schema.Struct({
					assigned: Schema.Array(Schema.String),
					delegated: Schema.Array(Schema.String),
					delegation_last_check: Schema.NullOr(Schema.String),
					delegation_status: Schema.optional(
						Schema.Literals(["valid", "partially-valid", "invalid", "lame", "unregistered", "unknown"]),
					),
				}),
				registrar: Schema.Literals(["hetzner", "other", "unknown"]),
				mode: Schema.Literals(["secondary"]),
			}),
		]),
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
}) as unknown as Schema.Codec<ZonesGetOutput>;

// The operation
/**
 * List Zones
 *
 * Returns all [Zones](#tag/zones).
 * Use the provided URI parameters to modify the result.
 *
 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param mode - Filter resources by their mode.

The response will only contain the resources matching exactly the specified mode.

 * @param labelSelector - Filter resources by labels.

The response will only contain resources matching the label selector.
For more information, see "[Label Selector](#description/label-selector)".

 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const zonesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesGetInput,
	outputSchema: ZonesGetOutput,
}));
