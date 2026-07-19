import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsMspTenantsIdDnsPostInput {
	id: string;
}
export const IntegrationsMspTenantsIdDnsPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/msp/tenants/{id}/dns" }),
) as unknown as Schema.Codec<IntegrationsMspTenantsIdDnsPostInput>;

// Output Schema
export type IntegrationsMspTenantsIdDnsPostOutput = void;
export const IntegrationsMspTenantsIdDnsPostOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IntegrationsMspTenantsIdDnsPostOutput>;

// The operation
/**
 * Verify a tenant domain DNS challenge
 *
 * @param id - The unique identifier of a tenant account
 */
export const integrationsMspTenantsIdDnsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsMspTenantsIdDnsPostInput,
	outputSchema: IntegrationsMspTenantsIdDnsPostOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
