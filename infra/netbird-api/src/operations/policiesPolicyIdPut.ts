import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PoliciesPolicyIdPutInput {
	policyId: string;
	name: string;
	description?: string;
	enabled: boolean;
	source_posture_checks?: ReadonlyArray<string>;
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
		sources?: ReadonlyArray<string>;
		sourceResource?: { id: string; type: {} };
		destinations?: ReadonlyArray<string>;
		destinationResource?: { id: string; type: {} };
	}>;
}
export const PoliciesPolicyIdPutInput = /*@__PURE__*/ Schema.Struct({
	policyId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	description: Schema.optional(Schema.String),
	enabled: Schema.Boolean,
	source_posture_checks: Schema.optional(Schema.Array(Schema.String)),
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
			sources: Schema.optional(Schema.Array(Schema.String)),
			sourceResource: Schema.optional(
				Schema.Struct({
					id: Schema.String,
					type: Schema.Struct({}),
				}),
			),
			destinations: Schema.optional(Schema.Array(Schema.String)),
			destinationResource: Schema.optional(
				Schema.Struct({
					id: Schema.String,
					type: Schema.Struct({}),
				}),
			),
		}),
	),
}).pipe(
	T.Http({ method: "PUT", path: "/api/policies/{policyId}" }),
) as unknown as Schema.Codec<PoliciesPolicyIdPutInput>;

// Output Schema
export interface PoliciesPolicyIdPutOutput {
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
export const PoliciesPolicyIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<PoliciesPolicyIdPutOutput>;

// The operation
/**
 * Update a Policy
 *
 * Update/Replace a Policy
 *
 * @param policyId - The unique identifier of a policy
 */
export const policiesPolicyIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: PoliciesPolicyIdPutInput,
	outputSchema: PoliciesPolicyIdPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
