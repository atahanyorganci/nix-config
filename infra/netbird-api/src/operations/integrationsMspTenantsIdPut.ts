import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsMspTenantsIdPutInput {
	id: string;
	name: string;
	groups: ReadonlyArray<{ id: string; role: string }>;
}
export const IntegrationsMspTenantsIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	groups: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			role: Schema.String,
		}),
	),
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/msp/tenants/{id}" }),
) as unknown as Schema.Codec<IntegrationsMspTenantsIdPutInput>;

// Output Schema
export interface IntegrationsMspTenantsIdPutOutput {
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
export const IntegrationsMspTenantsIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<IntegrationsMspTenantsIdPutOutput>;

// The operation
/**
 * Update MSP tenant
 *
 * @param id - The unique identifier of a tenant account
 */
export const integrationsMspTenantsIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsMspTenantsIdPutInput,
	outputSchema: IntegrationsMspTenantsIdPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
