import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PrimaryIpsIdGetInput {
	id: number;
}
export const PrimaryIpsIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/primary_ips/{id}" })) as unknown as Schema.Codec<PrimaryIpsIdGetInput>;

// Output Schema
export interface PrimaryIpsIdGetOutput {
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
export const PrimaryIpsIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<PrimaryIpsIdGetOutput>;

// The operation
/**
 * Get a Primary IP
 *
 * Returns a [Primary IP](#tag/primary-ips).
 *
 * @param id - ID of the Primary IP.
 */
export const primaryIpsIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PrimaryIpsIdGetInput,
	outputSchema: PrimaryIpsIdGetOutput,
}));
