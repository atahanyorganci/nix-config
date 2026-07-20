import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface IntegrationsEdrFalconPutInput {
	client_id: string;
	secret: string | Redacted.Redacted<string>;
	cloud_id: string;
	groups: ReadonlyArray<string>;
	zta_score_threshold: number;
	enabled?: boolean;
}
export const IntegrationsEdrFalconPutInput = /*@__PURE__*/ Schema.Struct({
	client_id: Schema.String,
	secret: SensitiveString,
	cloud_id: Schema.String,
	groups: Schema.Array(Schema.String),
	zta_score_threshold: Schema.Number,
	enabled: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/edr/falcon" }),
) as unknown as Schema.Codec<IntegrationsEdrFalconPutInput>;

// Output Schema
export interface IntegrationsEdrFalconPutOutput {
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
export const IntegrationsEdrFalconPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<IntegrationsEdrFalconPutOutput>;

// The operation
/**
 * Update EDR Falcon Integration
 *
 * Updates an existing EDR Falcon Integration.
 */
export const integrationsEdrFalconPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrFalconPutInput,
	outputSchema: IntegrationsEdrFalconPutOutput,
	errors: [BadRequest, NotFound] as const,
}));
