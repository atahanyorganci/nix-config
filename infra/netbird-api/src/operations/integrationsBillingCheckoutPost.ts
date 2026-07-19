import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingCheckoutPostInput {
	baseURL: string;
	priceID: string;
	enableTrial?: boolean;
}
export const IntegrationsBillingCheckoutPostInput = /*@__PURE__*/ Schema.Struct({
	baseURL: Schema.String,
	priceID: Schema.String,
	enableTrial: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/billing/checkout" }),
) as unknown as Schema.Codec<IntegrationsBillingCheckoutPostInput>;

// Output Schema
export interface IntegrationsBillingCheckoutPostOutput {
	session_id: string;
	url: string;
}
export const IntegrationsBillingCheckoutPostOutput = /*@__PURE__*/ Schema.Struct({
	session_id: Schema.String,
	url: Schema.String,
}) as unknown as Schema.Codec<IntegrationsBillingCheckoutPostOutput>;

// The operation
/**
 * Create checkout session
 */
export const integrationsBillingCheckoutPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingCheckoutPostInput,
	outputSchema: IntegrationsBillingCheckoutPostOutput,
	errors: [BadRequest] as const,
}));
