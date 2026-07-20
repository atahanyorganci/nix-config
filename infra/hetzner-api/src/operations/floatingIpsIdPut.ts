import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FloatingIpsIdPutInput {
	id: number;
	description?: string | null;
	name?: string;
	labels?: Record<string, string>;
}
export const FloatingIpsIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	description: Schema.optional(Schema.NullOr(Schema.String)),
	name: Schema.optional(Schema.String),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "PUT", path: "/floating_ips/{id}" })) as unknown as Schema.Codec<FloatingIpsIdPutInput>;

// Output Schema
export interface FloatingIpsIdPutOutput {
	floating_ip: {
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
	};
}
export const FloatingIpsIdPutOutput = /*@__PURE__*/ Schema.Struct({
	floating_ip: Schema.Struct({
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
}) as unknown as Schema.Codec<FloatingIpsIdPutOutput>;

// The operation
/**
 * Update a Floating IP
 *
 * Update a [Floating IP](#tag/floating-ips).
 *
 * @param id - ID of the Floating IP.
 */
export const floatingIpsIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: FloatingIpsIdPutInput,
	outputSchema: FloatingIpsIdPutOutput,
}));
