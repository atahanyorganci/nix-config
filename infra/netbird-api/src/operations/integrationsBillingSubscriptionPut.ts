import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingSubscriptionPutInput {
	priceID?: string;
	plan_tier?: string;
}
export const IntegrationsBillingSubscriptionPutInput = /*@__PURE__*/ Schema.Struct({
	priceID: Schema.optional(Schema.String),
	plan_tier: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/billing/subscription" }),
) as unknown as Schema.Codec<IntegrationsBillingSubscriptionPutInput>;

// Output Schema
export type IntegrationsBillingSubscriptionPutOutput = void;
export const IntegrationsBillingSubscriptionPutOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IntegrationsBillingSubscriptionPutOutput>;

// The operation
/**
 * Change subscription
 */
export const integrationsBillingSubscriptionPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingSubscriptionPutInput,
	outputSchema: IntegrationsBillingSubscriptionPutOutput,
	errors: [BadRequest] as const,
}));
