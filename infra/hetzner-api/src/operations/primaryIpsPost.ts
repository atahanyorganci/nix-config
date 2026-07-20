import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PrimaryIpsPostInput {
	name: string;
	labels?: Record<string, string>;
	type: "ipv4" | "ipv6";
	location?: string | number;
	assignee_type?: "server";
	assignee_id?: number | null;
	auto_delete?: boolean;
}
export const PrimaryIpsPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	type: Schema.Literals(["ipv4", "ipv6"]),
	location: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
	assignee_type: Schema.optional(Schema.Literals(["server"])),
	assignee_id: Schema.optional(Schema.NullOr(Schema.Number)),
	auto_delete: Schema.optional(Schema.Boolean),
}).pipe(T.Http({ method: "POST", path: "/primary_ips" })) as unknown as Schema.Codec<PrimaryIpsPostInput>;

// Output Schema
export interface PrimaryIpsPostOutput {
	primary_ip: {
		id: number;
		name: string;
		labels: Record<string, string>;
		created: string;
		blocked: boolean;
		location: {
			id: number;
			name: string;
			description: string;
			country: string;
			city: string;
			latitude: number;
			longitude: number;
			network_zone: string;
		};
		ip: string;
		dns_ptr: ReadonlyArray<{ ip: string; dns_ptr: string }>;
		protection: { delete: boolean };
		type: "ipv4" | "ipv6";
		auto_delete: boolean;
		assignee_type: "server";
		assignee_id: number | null;
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
export const PrimaryIpsPostOutput = /*@__PURE__*/ Schema.Struct({
	primary_ip: Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		labels: Schema.Record(Schema.String, Schema.String),
		created: Schema.String,
		blocked: Schema.Boolean,
		location: Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			description: Schema.String,
			country: Schema.String,
			city: Schema.String,
			latitude: Schema.Number,
			longitude: Schema.Number,
			network_zone: Schema.String,
		}),
		ip: Schema.String,
		dns_ptr: Schema.Array(
			Schema.Struct({
				ip: Schema.String,
				dns_ptr: Schema.String,
			}),
		),
		protection: Schema.Struct({
			delete: Schema.Boolean,
		}),
		type: Schema.Literals(["ipv4", "ipv6"]),
		auto_delete: Schema.Boolean,
		assignee_type: Schema.Literals(["server"]),
		assignee_id: Schema.NullOr(Schema.Number),
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
}) as unknown as Schema.Codec<PrimaryIpsPostOutput>;

// The operation
/**
 * Create a Primary IP
 *
 * Create a new [Primary IP](#tag/primary-ips).
 * Can optionally be assigned to a resource by providing an `assignee_id` and `assignee_type`.
 * If not assigned to a resource the `location` key needs to be provided. This can be either the ID or the name of the [Location](#tag/locations) this [Primary IP](#tag/primary-ips) shall be created in.
 * A [Primary IP](#tag/primary-ips) can only be assigned to resource in the same [Location](#tag/locations) later on.
 * #### Operation specific errors
 */
export const primaryIpsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: PrimaryIpsPostInput,
	outputSchema: PrimaryIpsPostOutput,
}));
