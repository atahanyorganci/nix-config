import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsMspTenantsIdUnlinkPostInput {
	id: string;
	owner: string;
}
export const IntegrationsMspTenantsIdUnlinkPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String.pipe(T.PathParam()),
	owner: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/msp/tenants/{id}/unlink" }),
) as unknown as Schema.Codec<IntegrationsMspTenantsIdUnlinkPostInput>;

// Output Schema
export type IntegrationsMspTenantsIdUnlinkPostOutput = void;
export const IntegrationsMspTenantsIdUnlinkPostOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IntegrationsMspTenantsIdUnlinkPostOutput>;

// The operation
/**
 * Unlink a tenant
 *
 * @param id - The unique identifier of a tenant account
 */
export const integrationsMspTenantsIdUnlinkPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsMspTenantsIdUnlinkPostInput,
	outputSchema: IntegrationsMspTenantsIdUnlinkPostOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
