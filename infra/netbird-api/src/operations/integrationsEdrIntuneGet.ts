import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsEdrIntuneGetInput {}
export const IntegrationsEdrIntuneGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/edr/intune" }),
) as unknown as Schema.Codec<IntegrationsEdrIntuneGetInput>;

// Output Schema
export interface IntegrationsEdrIntuneGetOutput {
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
		peers: ReadonlyArray<{ id: string; name: string }> | null;
		resources: ReadonlyArray<{ id: string; type: {} }> | null;
	}>;
	last_synced_interval: number;
	enabled: boolean;
}
export const IntegrationsEdrIntuneGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<IntegrationsEdrIntuneGetOutput>;

// The operation
/**
 * Get EDR Intune Integration
 *
 * Retrieves a specific EDR Intune integration by its ID.
 */
export const integrationsEdrIntuneGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrIntuneGetInput,
	outputSchema: IntegrationsEdrIntuneGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
