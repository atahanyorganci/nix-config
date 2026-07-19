import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsMspTenantsIdSubscriptionPostInput {
	id: string;
	priceID: string;
}
export const IntegrationsMspTenantsIdSubscriptionPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String.pipe(T.PathParam()),
	priceID: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/msp/tenants/{id}/subscription" }),
) as unknown as Schema.Codec<IntegrationsMspTenantsIdSubscriptionPostInput>;

// Output Schema
export type IntegrationsMspTenantsIdSubscriptionPostOutput = void;
export const IntegrationsMspTenantsIdSubscriptionPostOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IntegrationsMspTenantsIdSubscriptionPostOutput>;

// The operation
/**
 * Create subscription for Tenant
 *
 * @param id - The unique identifier of a tenant account
 */
export const integrationsMspTenantsIdSubscriptionPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsMspTenantsIdSubscriptionPostInput,
	outputSchema: IntegrationsMspTenantsIdSubscriptionPostOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
