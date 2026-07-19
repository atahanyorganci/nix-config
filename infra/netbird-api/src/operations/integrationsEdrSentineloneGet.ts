import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsEdrSentineloneGetInput {}
export const IntegrationsEdrSentineloneGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/edr/sentinelone" }),
) as unknown as Schema.Codec<IntegrationsEdrSentineloneGetInput>;

// Output Schema
export interface IntegrationsEdrSentineloneGetOutput {
	id: number;
	account_id: string;
	last_synced_at: string;
	created_by: string;
	created_at: string;
	updated_at: string;
	api_url: string;
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
	match_attributes: {
		active_threats?: number;
		encrypted_applications?: boolean;
		firewall_enabled?: boolean;
		infected?: boolean;
		is_active?: boolean;
		is_up_to_date?: boolean;
		network_status?: "connected" | "disconnected" | "quarantined";
		operational_state?: string;
	};
	enabled: boolean;
}
export const IntegrationsEdrSentineloneGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number,
	account_id: Schema.String,
	last_synced_at: Schema.String,
	created_by: Schema.String,
	created_at: Schema.String,
	updated_at: Schema.String,
	api_url: Schema.String,
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
	match_attributes: Schema.Struct({
		active_threats: Schema.optional(Schema.Number),
		encrypted_applications: Schema.optional(Schema.Boolean),
		firewall_enabled: Schema.optional(Schema.Boolean),
		infected: Schema.optional(Schema.Boolean),
		is_active: Schema.optional(Schema.Boolean),
		is_up_to_date: Schema.optional(Schema.Boolean),
		network_status: Schema.optional(Schema.Literals(["connected", "disconnected", "quarantined"])),
		operational_state: Schema.optional(Schema.String),
	}),
	enabled: Schema.Boolean,
}) as unknown as Schema.Codec<IntegrationsEdrSentineloneGetOutput>;

// The operation
/**
 * Get EDR SentinelOne Integration
 *
 * Retrieves a specific EDR SentinelOne integration by its ID.
 */
export const integrationsEdrSentineloneGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrSentineloneGetInput,
	outputSchema: IntegrationsEdrSentineloneGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
