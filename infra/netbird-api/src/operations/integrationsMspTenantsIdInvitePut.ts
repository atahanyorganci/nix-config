import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsMspTenantsIdInvitePutInput {
	id: string;
	value: "accept" | "decline";
}
export const IntegrationsMspTenantsIdInvitePutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String.pipe(T.PathParam()),
	value: Schema.Literals(["accept", "decline"]),
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/msp/tenants/{id}/invite" }),
) as unknown as Schema.Codec<IntegrationsMspTenantsIdInvitePutInput>;

// Output Schema
export type IntegrationsMspTenantsIdInvitePutOutput = void;
export const IntegrationsMspTenantsIdInvitePutOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IntegrationsMspTenantsIdInvitePutOutput>;

// The operation
/**
 * Response by the invited Tenant account owner
 *
 * @param id - The unique identifier of an existing tenant account
 */
export const integrationsMspTenantsIdInvitePut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsMspTenantsIdInvitePutInput,
	outputSchema: IntegrationsMspTenantsIdInvitePutOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
