import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsMspTenantsIdInvitePostInput {
	id: string;
}
export const IntegrationsMspTenantsIdInvitePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/msp/tenants/{id}/invite" }),
) as unknown as Schema.Codec<IntegrationsMspTenantsIdInvitePostInput>;

// Output Schema
export interface IntegrationsMspTenantsIdInvitePostOutput {
	id: string;
	name: string;
	domain: string;
	groups: ReadonlyArray<{ id: string; role: string }>;
	activated_at?: string;
	dns_challenge: string;
	created_at: string;
	updated_at: string;
	invited_at?: string;
	status: "existing" | "invited" | "pending" | "active";
}
export const IntegrationsMspTenantsIdInvitePostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	domain: Schema.String,
	groups: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			role: Schema.String,
		}),
	),
	activated_at: Schema.optional(Schema.String),
	dns_challenge: Schema.String,
	created_at: Schema.String,
	updated_at: Schema.String,
	invited_at: Schema.optional(Schema.String),
	status: Schema.Literals(["existing", "invited", "pending", "active"]),
}) as unknown as Schema.Codec<IntegrationsMspTenantsIdInvitePostOutput>;

// The operation
/**
 * Invite existing account as a Tenant to the MSP account
 *
 * @param id - The unique identifier of an existing tenant account
 */
export const integrationsMspTenantsIdInvitePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsMspTenantsIdInvitePostInput,
	outputSchema: IntegrationsMspTenantsIdInvitePostOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
