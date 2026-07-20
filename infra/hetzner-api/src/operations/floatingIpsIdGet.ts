import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FloatingIpsIdGetInput {
	id: number;
}
export const FloatingIpsIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/floating_ips/{id}" })) as unknown as Schema.Codec<FloatingIpsIdGetInput>;

// Output Schema
export interface FloatingIpsIdGetOutput {
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
export const FloatingIpsIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<FloatingIpsIdGetOutput>;

// The operation
/**
 * Get a Floating IP
 *
 * Returns a single [Floating IP](#tag/floating-ips).
 *
 * @param id - ID of the Floating IP.
 */
export const floatingIpsIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: FloatingIpsIdGetInput,
	outputSchema: FloatingIpsIdGetOutput,
}));
