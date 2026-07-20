import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesPostInput {
	name: string;
	mode: "primary" | "secondary";
	ttl?: number;
	labels?: Record<string, string>;
	primary_nameservers?: ReadonlyArray<{
		address: string;
		port?: number;
		tsig_key?: string;
		tsig_algorithm?: "hmac-md5" | "hmac-sha1" | "hmac-sha256";
	}>;
	rrsets?: ReadonlyArray<{
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
		ttl?: number | null;
		records: ReadonlyArray<{ value: string; comment?: string }>;
		labels?: Record<string, string>;
	}>;
	zonefile?: string;
}
export const ZonesPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	mode: Schema.Literals(["primary", "secondary"]),
	ttl: Schema.optional(Schema.Number),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
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
	rrsets: Schema.optional(
		Schema.Array(
			Schema.Struct({
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
				ttl: Schema.optional(Schema.NullOr(Schema.Number)),
				records: Schema.Array(
					Schema.Struct({
						value: Schema.String,
						comment: Schema.optional(Schema.String),
					}),
				),
				labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
			}),
		),
	),
	zonefile: Schema.optional(Schema.String),
}).pipe(T.Http({ method: "POST", path: "/zones" })) as unknown as Schema.Codec<ZonesPostInput>;

// Output Schema
export interface ZonesPostOutput {
	zone:
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
		  };
	action: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	};
}
export const ZonesPostOutput = /*@__PURE__*/ Schema.Struct({
	zone: Schema.Union([
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
	action: Schema.Struct({
		id: Schema.Number,
		command: Schema.String,
		status: Schema.Literals(["running", "success", "error"]),
		started: Schema.String,
		finished: Schema.NullOr(Schema.String),
		progress: Schema.Number,
		resources: Schema.Array(
			Schema.Struct({
				id: Schema.Number,
				type: Schema.String,
			}),
		),
		error: Schema.NullOr(
			Schema.Struct({
				code: Schema.String,
				message: Schema.String,
			}),
		),
	}),
}) as unknown as Schema.Codec<ZonesPostOutput>;

// The operation
/**
 * Create a Zone
 *
 * Creates a [Zone](#tag/zones).
 * A default `SOA` and three `NS` resource records with the assigned Hetzner
 * nameservers are created automatically.
 */
export const zonesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesPostInput,
	outputSchema: ZonesPostOutput,
}));
