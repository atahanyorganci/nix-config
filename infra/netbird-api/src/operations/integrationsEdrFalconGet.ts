import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsEdrFalconGetInput {}
export const IntegrationsEdrFalconGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/edr/falcon" }),
) as unknown as Schema.Codec<IntegrationsEdrFalconGetInput>;

// Output Schema
export interface IntegrationsEdrFalconGetOutput {
	id: number;
	account_id: string;
	last_synced_at: string;
	created_by: string;
	created_at: string;
	updated_at: string;
	cloud_id: string;
	groups: ReadonlyArray<{
		id: string;
		name: string;
		peers_count: number;
		resources_count: number;
		issued?: "api" | "integration" | "jwt";
		peers: ReadonlyArray<{ id: string; name: string }> | null;
		resources: ReadonlyArray<{ id: string; type: {} }> | null;
	}>;
	zta_score_threshold: number;
	enabled: boolean;
}
export const IntegrationsEdrFalconGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number,
	account_id: Schema.String,
	last_synced_at: Schema.String,
	created_by: Schema.String,
	created_at: Schema.String,
	updated_at: Schema.String,
	cloud_id: Schema.String,
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
	zta_score_threshold: Schema.Number,
	enabled: Schema.Boolean,
}) as unknown as Schema.Codec<IntegrationsEdrFalconGetOutput>;

// The operation
/**
 * Get EDR Falcon Integration
 *
 * Retrieves a specific EDR Falcon integration by its ID.
 */
export const integrationsEdrFalconGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrFalconGetInput,
	outputSchema: IntegrationsEdrFalconGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
