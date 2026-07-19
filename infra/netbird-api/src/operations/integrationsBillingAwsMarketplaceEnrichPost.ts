import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingAwsMarketplaceEnrichPostInput {
	aws_user_id: string;
}
export const IntegrationsBillingAwsMarketplaceEnrichPostInput = /*@__PURE__*/ Schema.Struct({
	aws_user_id: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/billing/aws/marketplace/enrich" }),
) as unknown as Schema.Codec<IntegrationsBillingAwsMarketplaceEnrichPostInput>;

// Output Schema
export type IntegrationsBillingAwsMarketplaceEnrichPostOutput = void;
export const IntegrationsBillingAwsMarketplaceEnrichPostOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IntegrationsBillingAwsMarketplaceEnrichPostOutput>;

// The operation
/**
 * Enrich AWS Marketplace subscription with Account ID.
 */
export const integrationsBillingAwsMarketplaceEnrichPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingAwsMarketplaceEnrichPostInput,
	outputSchema: IntegrationsBillingAwsMarketplaceEnrichPostOutput,
	errors: [BadRequest] as const,
}));
