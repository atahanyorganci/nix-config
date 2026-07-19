import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PoliciesPolicyIdGetInput {
	policyId: string;
}
export const PoliciesPolicyIdGetInput = /*@__PURE__*/ Schema.Struct({
	policyId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/policies/{policyId}" }),
) as unknown as Schema.Codec<PoliciesPolicyIdGetInput>;

// Output Schema
export interface PoliciesPolicyIdGetOutput {
	name: string;
	description?: string;
	enabled: boolean;
	id?: string;
	source_posture_checks: ReadonlyArray<string>;
	rules: ReadonlyArray<{
		name: string;
		description?: string;
		enabled: boolean;
		action: "accept" | "drop";
		bidirectional: boolean;
		protocol: "all" | "tcp" | "udp" | "icmp" | "netbird-ssh";
		ports?: ReadonlyArray<string>;
		port_ranges?: ReadonlyArray<{ start: number; end: number }>;
		authorized_groups?: Record<string, ReadonlyArray<string>>;
		id?: string;
		sources?: ReadonlyArray<{
			id: string;
			name: string;
			peers_count: number;
			resources_count: number;
			issued?: "api" | "integration" | "jwt";
		}>;
		sourceResource?: { id: string; type: {} };
		destinations?: ReadonlyArray<{
			id: string;
			name: string;
			peers_count: number;
			resources_count: number;
			issued?: "api" | "integration" | "jwt";
		}>;
		destinationResource?: { id: string; type: {} };
	}>;
}
export const PoliciesPolicyIdGetOutput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	description: Schema.optional(Schema.String),
	enabled: Schema.Boolean,
	id: Schema.optional(Schema.String),
	source_posture_checks: Schema.Array(Schema.String),
	rules: Schema.Array(
		Schema.Struct({
			name: Schema.String,
			description: Schema.optional(Schema.String),
			enabled: Schema.Boolean,
			action: Schema.Literals(["accept", "drop"]),
			bidirectional: Schema.Boolean,
			protocol: Schema.Literals(["all", "tcp", "udp", "icmp", "netbird-ssh"]),
			ports: Schema.optional(Schema.Array(Schema.String)),
			port_ranges: Schema.optional(
				Schema.Array(
					Schema.Struct({
						start: Schema.Number,
						end: Schema.Number,
					}),
				),
			),
			authorized_groups: Schema.optional(Schema.Record(Schema.String, Schema.Array(Schema.String))),
			id: Schema.optional(Schema.String),
			sources: Schema.optional(
				Schema.Array(
					Schema.Struct({
						id: Schema.String,
						name: Schema.String,
						peers_count: Schema.Number,
						resources_count: Schema.Number,
						issued: Schema.optional(Schema.Literals(["api", "integration", "jwt"])),
					}),
				),
			),
			sourceResource: Schema.optional(
				Schema.Struct({
					id: Schema.String,
					type: Schema.Struct({}),
				}),
			),
			destinations: Schema.optional(
				Schema.Array(
					Schema.Struct({
						id: Schema.String,
						name: Schema.String,
						peers_count: Schema.Number,
						resources_count: Schema.Number,
						issued: Schema.optional(Schema.Literals(["api", "integration", "jwt"])),
					}),
				),
			),
			destinationResource: Schema.optional(
				Schema.Struct({
					id: Schema.String,
					type: Schema.Struct({}),
				}),
			),
		}),
	),
}) as unknown as Schema.Codec<PoliciesPolicyIdGetOutput>;

// The operation
/**
 * Retrieve a Policy
 *
 * Get information about a Policies
 *
 * @param policyId - The unique identifier of a policy
 */
export const policiesPolicyIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PoliciesPolicyIdGetInput,
	outputSchema: PoliciesPolicyIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
