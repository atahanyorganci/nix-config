import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsEdrFleetdmGetInput {}
export const IntegrationsEdrFleetdmGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/edr/fleetdm" }),
) as unknown as Schema.Codec<IntegrationsEdrFleetdmGetInput>;

// Output Schema
export interface IntegrationsEdrFleetdmGetOutput {
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
		peers: ReadonlyArray<{ id: string; name: string }>;
		resources: ReadonlyArray<{ id: string; type: {} }>;
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
export const IntegrationsEdrFleetdmGetOutput = /*@__PURE__*/ Schema.Struct({
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
			peers: Schema.Array(
				Schema.Struct({
					id: Schema.String,
					name: Schema.String,
				}),
			),
			resources: Schema.Array(
				Schema.Struct({
					id: Schema.String,
					type: Schema.Struct({}),
				}),
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
}) as unknown as Schema.Codec<IntegrationsEdrFleetdmGetOutput>;

// The operation
/**
 * Get EDR FleetDM Integration
 *
 * Retrieves a specific EDR FleetDM integration by its ID.
 */
export const integrationsEdrFleetdmGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrFleetdmGetInput,
	outputSchema: IntegrationsEdrFleetdmGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
