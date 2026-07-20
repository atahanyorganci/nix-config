import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface IntegrationsEdrFleetdmPutInput {
	api_url: string;
	api_token: string | Redacted.Redacted<string>;
	groups: ReadonlyArray<string>;
	last_synced_interval: number;
	enabled?: boolean;
	match_attributes: {
		disk_encryption_enabled?: boolean;
		failing_policies_count_max?: number;
		vulnerable_software_count_max?: number;
		status_online?: boolean;
		required_policies?: ReadonlyArray<number>;
	};
}
export const IntegrationsEdrFleetdmPutInput = /*@__PURE__*/ Schema.Struct({
	api_url: Schema.String,
	api_token: SensitiveString,
	groups: Schema.Array(Schema.String),
	last_synced_interval: Schema.Number,
	enabled: Schema.optional(Schema.Boolean),
	match_attributes: Schema.Struct({
		disk_encryption_enabled: Schema.optional(Schema.Boolean),
		failing_policies_count_max: Schema.optional(Schema.Number),
		vulnerable_software_count_max: Schema.optional(Schema.Number),
		status_online: Schema.optional(Schema.Boolean),
		required_policies: Schema.optional(Schema.Array(Schema.Number)),
	}),
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/edr/fleetdm" }),
) as unknown as Schema.Codec<IntegrationsEdrFleetdmPutInput>;

// Output Schema
export interface IntegrationsEdrFleetdmPutOutput {
	id: number;
	account_id: string;
	api_url: string;
	last_synced_at: string;
	created_by: string;
	created_at: string;
	updated_at: string;
	groups: ReadonlyArray<{
		id: string;
		name: string;
		peers_count: number;
		resources_count: number;
		issued?: "api" | "integration" | "jwt";
		peers: ReadonlyArray<{ id: string; name: string }> | null;
		resources: ReadonlyArray<{ id: string; type: {} }> | null;
	}>;
	last_synced_interval: number;
	enabled: boolean;
	match_attributes: {
		disk_encryption_enabled?: boolean;
		failing_policies_count_max?: number;
		vulnerable_software_count_max?: number;
		status_online?: boolean;
		required_policies?: ReadonlyArray<number>;
	};
}
export const IntegrationsEdrFleetdmPutOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number,
	account_id: Schema.String,
	api_url: Schema.String,
	last_synced_at: Schema.String,
	created_by: Schema.String,
	created_at: Schema.String,
	updated_at: Schema.String,
	groups: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			name: Schema.String,
			peers_count: Schema.Number,
			resources_count: Schema.Number,
			issued: Schema.optional(Schema.Literals(["api", "integration", "jwt"])),
			peers: Schema.NullOr(
				Schema.Array(
					Schema.Struct({
						id: Schema.String,
						name: Schema.String,
					}),
				),
			),
			resources: Schema.NullOr(
				Schema.Array(
					Schema.Struct({
						id: Schema.String,
						type: Schema.Struct({}),
					}),
				),
			),
		}),
	),
	last_synced_interval: Schema.Number,
	enabled: Schema.Boolean,
	match_attributes: Schema.Struct({
		disk_encryption_enabled: Schema.optional(Schema.Boolean),
		failing_policies_count_max: Schema.optional(Schema.Number),
		vulnerable_software_count_max: Schema.optional(Schema.Number),
		status_online: Schema.optional(Schema.Boolean),
		required_policies: Schema.optional(Schema.Array(Schema.Number)),
	}),
}) as unknown as Schema.Codec<IntegrationsEdrFleetdmPutOutput>;

// The operation
/**
 * Update EDR FleetDM Integration
 *
 * Updates an existing EDR FleetDM Integration.
 */
export const integrationsEdrFleetdmPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrFleetdmPutInput,
	outputSchema: IntegrationsEdrFleetdmPutOutput,
	errors: [BadRequest, NotFound] as const,
}));
