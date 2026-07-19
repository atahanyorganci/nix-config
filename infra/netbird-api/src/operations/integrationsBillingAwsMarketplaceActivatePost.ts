import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingAwsMarketplaceActivatePostInput {
	plan_tier: string;
}
export const IntegrationsBillingAwsMarketplaceActivatePostInput = /*@__PURE__*/ Schema.Struct({
	plan_tier: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/billing/aws/marketplace/activate" }),
) as unknown as Schema.Codec<IntegrationsBillingAwsMarketplaceActivatePostInput>;

// Output Schema
export type IntegrationsBillingAwsMarketplaceActivatePostOutput = void;
export const IntegrationsBillingAwsMarketplaceActivatePostOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IntegrationsBillingAwsMarketplaceActivatePostOutput>;

// The operation
/**
 * Activate AWS Marketplace subscription.
 */
export const integrationsBillingAwsMarketplaceActivatePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingAwsMarketplaceActivatePostInput,
	outputSchema: IntegrationsBillingAwsMarketplaceActivatePostOutput,
	errors: [BadRequest] as const,
}));
