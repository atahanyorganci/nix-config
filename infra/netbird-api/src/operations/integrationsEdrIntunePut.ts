import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface IntegrationsEdrIntunePutInput {
	client_id: string;
	tenant_id: string;
	secret: string | Redacted.Redacted<string>;
	groups: ReadonlyArray<string>;
	last_synced_interval: number;
	enabled?: boolean;
}
export const IntegrationsEdrIntunePutInput = /*@__PURE__*/ Schema.Struct({
	client_id: Schema.String,
	tenant_id: Schema.String,
	secret: SensitiveString,
	groups: Schema.Array(Schema.String),
	last_synced_interval: Schema.Number,
	enabled: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/edr/intune" }),
) as unknown as Schema.Codec<IntegrationsEdrIntunePutInput>;

// Output Schema
export interface IntegrationsEdrIntunePutOutput {
	id: number;
	account_id: string;
	last_synced_at: string;
	created_by: string;
	created_at: string;
	updated_at: string;
	client_id: string;
	tenant_id: string;
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
}
export const IntegrationsEdrIntunePutOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number,
	account_id: Schema.String,
	last_synced_at: Schema.String,
	created_by: Schema.String,
	created_at: Schema.String,
	updated_at: Schema.String,
	client_id: Schema.String,
	tenant_id: Schema.String,
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
}) as unknown as Schema.Codec<IntegrationsEdrIntunePutOutput>;

// The operation
/**
 * Update EDR Intune Integration
 *
 * Updates an existing EDR Intune Integration. The request body structure is `EDRIntuneRequest`.
 */
export const integrationsEdrIntunePut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrIntunePutInput,
	outputSchema: IntegrationsEdrIntunePutOutput,
	errors: [BadRequest, NotFound] as const,
}));
