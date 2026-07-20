import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FloatingIpsPostInput {
	type: "ipv4" | "ipv6";
	server?: number | null;
	home_location?: string | number;
	description?: string | null;
	name?: string;
	labels?: Record<string, string>;
}
export const FloatingIpsPostInput = /*@__PURE__*/ Schema.Struct({
	type: Schema.Literals(["ipv4", "ipv6"]),
	server: Schema.optional(Schema.NullOr(Schema.Number)),
	home_location: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
	description: Schema.optional(Schema.NullOr(Schema.String)),
	name: Schema.optional(Schema.String),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "POST", path: "/floating_ips" })) as unknown as Schema.Codec<FloatingIpsPostInput>;

// Output Schema
export interface FloatingIpsPostOutput {
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
	action?: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	} | null;
}
export const FloatingIpsPostOutput = /*@__PURE__*/ Schema.Struct({
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
	action: Schema.optional(
		Schema.NullOr(
			Schema.Struct({
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
		),
	),
}) as unknown as Schema.Codec<FloatingIpsPostOutput>;

// The operation
/**
 * Create a Floating IP
 *
 * Create a [Floating IP](#tag/floating-ips).
 * Provide the `server` attribute to assign the [Floating IP](#tag/floating-ips) to that server or provide a `home_location` to locate the [Floating IP](#tag/floating-ips) at. Note that the [Floating IP](#tag/floating-ips) can be assigned to a [Server](#tag/servers) in any [Location](#tag/locations) later on. For optimal routing it is advised to use the [Floating IP](#tag/floating-ips) in the same [Location](#tag/locations) it was created in.
 */
export const floatingIpsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: FloatingIpsPostInput,
	outputSchema: FloatingIpsPostOutput,
}));
