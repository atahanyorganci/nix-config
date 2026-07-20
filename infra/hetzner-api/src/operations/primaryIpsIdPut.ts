import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PrimaryIpsIdPutInput {
	id: number;
	name?: string;
	labels?: Record<string, string>;
	auto_delete?: boolean;
}
export const PrimaryIpsIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	name: Schema.optional(Schema.String),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	auto_delete: Schema.optional(Schema.Boolean),
}).pipe(T.Http({ method: "PUT", path: "/primary_ips/{id}" })) as unknown as Schema.Codec<PrimaryIpsIdPutInput>;

// Output Schema
export interface PrimaryIpsIdPutOutput {
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
}
export const PrimaryIpsIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<PrimaryIpsIdPutOutput>;

// The operation
/**
 * Update a Primary IP
 *
 * Update a [Primary IP](#tag/primary-ips).
 * If another change is concurrently performed on this [Primary IP](#tag/primary-ips), a error response with code `conflict` will be returned.
 *
 * @param id - ID of the Primary IP.
 */
export const primaryIpsIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: PrimaryIpsIdPutInput,
	outputSchema: PrimaryIpsIdPutOutput,
}));
