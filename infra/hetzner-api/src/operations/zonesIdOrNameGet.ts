import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameGetInput {
	idOrName: string;
}
export const ZonesIdOrNameGetInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/zones/{idOrName}" })) as unknown as Schema.Codec<ZonesIdOrNameGetInput>;

// Output Schema
export interface ZonesIdOrNameGetOutput {
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
}
export const ZonesIdOrNameGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNameGetOutput>;

// The operation
/**
 * Get a Zone
 *
 * Returns a single [Zone](#tag/zones).
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameGetInput,
	outputSchema: ZonesIdOrNameGetOutput,
}));
