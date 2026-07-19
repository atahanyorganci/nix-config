import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface IntegrationsEdrSentinelonePostInput {
	api_token: string | Redacted.Redacted<string>;
	api_url: string;
	groups: ReadonlyArray<string>;
	last_synced_interval: number;
	enabled?: boolean;
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
}
export const IntegrationsEdrSentinelonePostInput = /*@__PURE__*/ Schema.Struct({
	api_token: SensitiveString,
	api_url: Schema.String,
	groups: Schema.Array(Schema.String),
	last_synced_interval: Schema.Number,
	enabled: Schema.optional(Schema.Boolean),
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
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/edr/sentinelone" }),
) as unknown as Schema.Codec<IntegrationsEdrSentinelonePostInput>;

// Output Schema
export interface IntegrationsEdrSentinelonePostOutput {
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
export const IntegrationsEdrSentinelonePostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<IntegrationsEdrSentinelonePostOutput>;

// The operation
/**
 * Create EDR SentinelOne Integration
 *
 * Creates a new EDR SentinelOne integration
 */
export const integrationsEdrSentinelonePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrSentinelonePostInput,
	outputSchema: IntegrationsEdrSentinelonePostOutput,
	errors: [BadRequest] as const,
}));
