import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsEdrHuntressGetInput {}
export const IntegrationsEdrHuntressGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/edr/huntress" }),
) as unknown as Schema.Codec<IntegrationsEdrHuntressGetInput>;

// Output Schema
export interface IntegrationsEdrHuntressGetOutput {
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
		peers: ReadonlyArray<{ id: string; name: string }> | null;
		resources: ReadonlyArray<{ id: string; type: {} }> | null;
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
export const IntegrationsEdrHuntressGetOutput = /*@__PURE__*/ Schema.Struct({
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
		defender_policy_status: Schema.optional(Schema.String),
		defender_status: Schema.optional(Schema.String),
		defender_substatus: Schema.optional(Schema.String),
		firewall_status: Schema.optional(Schema.String),
	}),
}) as unknown as Schema.Codec<IntegrationsEdrHuntressGetOutput>;

// The operation
/**
 * Get EDR Huntress Integration
 *
 * Retrieves a specific EDR Huntress integration by its ID.
 */
export const integrationsEdrHuntressGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrHuntressGetInput,
	outputSchema: IntegrationsEdrHuntressGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
