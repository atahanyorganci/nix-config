import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsMspTenantsPostInput {
	name: string;
	domain: string;
	groups: ReadonlyArray<{ id: string; role: string }>;
}
export const IntegrationsMspTenantsPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	domain: Schema.String,
	groups: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			role: Schema.String,
		}),
	),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/msp/tenants" }),
) as unknown as Schema.Codec<IntegrationsMspTenantsPostInput>;

// Output Schema
export interface IntegrationsMspTenantsPostOutput {
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
export const IntegrationsMspTenantsPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<IntegrationsMspTenantsPostOutput>;

// The operation
/**
 * Create MSP tenant
 */
export const integrationsMspTenantsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsMspTenantsPostInput,
	outputSchema: IntegrationsMspTenantsPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
