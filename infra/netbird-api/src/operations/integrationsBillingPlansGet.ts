import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingPlansGetInput {}
export const IntegrationsBillingPlansGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/billing/plans" }),
) as unknown as Schema.Codec<IntegrationsBillingPlansGetInput>;

// Output Schema
export type IntegrationsBillingPlansGetOutput = ReadonlyArray<{
	name: string;
	description: string;
	features: ReadonlyArray<string>;
	prices: ReadonlyArray<{ price_id: string; currency: string; price: number; unit: string }>;
	free: boolean;
}>;
export const IntegrationsBillingPlansGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		name: Schema.String,
		description: Schema.String,
		features: Schema.Array(Schema.String),
		prices: Schema.Array(
			Schema.Struct({
				price_id: Schema.String,
				currency: Schema.String,
				price: Schema.Number,
				unit: Schema.String,
			}),
		),
		free: Schema.Boolean,
	}),
) as unknown as Schema.Codec<IntegrationsBillingPlansGetOutput>;

// The operation
/**
 * Get available plans
 */
export const integrationsBillingPlansGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingPlansGetInput,
	outputSchema: IntegrationsBillingPlansGetOutput,
}));
