import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNamePutInput {
	idOrName: string;
	labels?: Record<string, string>;
}
export const ZonesIdOrNamePutInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "PUT", path: "/zones/{idOrName}" })) as unknown as Schema.Codec<ZonesIdOrNamePutInput>;

// Output Schema
export interface ZonesIdOrNamePutOutput {
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
export const ZonesIdOrNamePutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNamePutOutput>;

// The operation
/**
 * Update a Zone
 *
 * Updates a [Zone](#tag/zones).
 * To modify resource record sets ([RRSets](#tag/zone-rrsets)), use the [RRSet Actions
 * endpoints](#tag/zone-rrset-actions).
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNamePut = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNamePutInput,
	outputSchema: ZonesIdOrNamePutOutput,
}));
