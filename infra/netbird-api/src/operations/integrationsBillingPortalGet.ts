import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingPortalGetInput {
	baseURL: string;
}
export const IntegrationsBillingPortalGetInput = /*@__PURE__*/ Schema.Struct({
	baseURL: Schema.String,
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/billing/portal" }),
) as unknown as Schema.Codec<IntegrationsBillingPortalGetInput>;

// Output Schema
export interface IntegrationsBillingPortalGetOutput {
	session_id: string;
	url: string;
}
export const IntegrationsBillingPortalGetOutput = /*@__PURE__*/ Schema.Struct({
	session_id: Schema.String,
	url: Schema.String,
}) as unknown as Schema.Codec<IntegrationsBillingPortalGetOutput>;

// The operation
/**
 * Get customer portal URL
 *
 * @param baseURL - The base URL for the redirect after accessing the portal.
 */
export const integrationsBillingPortalGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingPortalGetInput,
	outputSchema: IntegrationsBillingPortalGetOutput,
	errors: [BadRequest] as const,
}));
