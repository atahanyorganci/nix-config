import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface IntegrationsEdrHuntressPostInput {
	api_key: string | Redacted.Redacted<string>;
	api_secret: string | Redacted.Redacted<string>;
	groups: ReadonlyArray<string>;
	last_synced_interval: number;
	enabled?: boolean;
	match_attributes: {
		defender_policy_status?: string;
		defender_status?: string;
		defender_substatus?: string;
		firewall_status?: string;
	};
}
export const IntegrationsEdrHuntressPostInput = /*@__PURE__*/ Schema.Struct({
	api_key: SensitiveString,
	api_secret: SensitiveString,
	groups: Schema.Array(Schema.String),
	last_synced_interval: Schema.Number,
	enabled: Schema.optional(Schema.Boolean),
	match_attributes: Schema.Struct({
		defender_policy_status: Schema.optional(Schema.String),
		defender_status: Schema.optional(Schema.String),
		defender_substatus: Schema.optional(Schema.String),
		firewall_status: Schema.optional(Schema.String),
	}),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/edr/huntress" }),
) as unknown as Schema.Codec<IntegrationsEdrHuntressPostInput>;

// Output Schema
export interface IntegrationsEdrHuntressPostOutput {
	id: number;
	account_id: string;
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
		defender_policy_status?: string;
		defender_status?: string;
		defender_substatus?: string;
		firewall_status?: string;
	};
}
export const IntegrationsEdrHuntressPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number,
	account_id: Schema.String,
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
		defender_policy_status: Schema.optional(Schema.String),
		defender_status: Schema.optional(Schema.String),
		defender_substatus: Schema.optional(Schema.String),
		firewall_status: Schema.optional(Schema.String),
	}),
}) as unknown as Schema.Codec<IntegrationsEdrHuntressPostOutput>;

// The operation
/**
 * Create EDR Huntress Integration
 *
 * Creates a new EDR Huntress integration
 */
export const integrationsEdrHuntressPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrHuntressPostInput,
	outputSchema: IntegrationsEdrHuntressPostOutput,
	errors: [BadRequest] as const,
}));
