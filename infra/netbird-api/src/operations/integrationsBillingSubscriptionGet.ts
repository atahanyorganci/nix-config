import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingSubscriptionGetInput {}
export const IntegrationsBillingSubscriptionGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/billing/subscription" }),
) as unknown as Schema.Codec<IntegrationsBillingSubscriptionGetInput>;

// Output Schema
export interface IntegrationsBillingSubscriptionGetOutput {
	active: boolean;
	plan_tier: string;
	price_id: string;
	remaining_trial?: number;
	features?: ReadonlyArray<string>;
	currency: string;
	price: number;
	provider: string;
	updated_at: string;
}
export const IntegrationsBillingSubscriptionGetOutput = /*@__PURE__*/ Schema.Struct({
	active: Schema.Boolean,
	plan_tier: Schema.String,
	price_id: Schema.String,
	remaining_trial: Schema.optional(Schema.Number),
	features: Schema.optional(Schema.Array(Schema.String)),
	currency: Schema.String,
	price: Schema.Number,
	provider: Schema.String,
	updated_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsBillingSubscriptionGetOutput>;

// The operation
/**
 * Get current subscription
 */
export const integrationsBillingSubscriptionGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingSubscriptionGetInput,
	outputSchema: IntegrationsBillingSubscriptionGetOutput,
	errors: [NotFound] as const,
}));
