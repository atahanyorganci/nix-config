import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface IntegrationsAzureIdpPostInput {
	group_prefixes?: ReadonlyArray<string>;
	user_group_prefixes?: ReadonlyArray<string>;
	connector_id?: string;
	client_secret: string | Redacted.Redacted<string>;
	client_id: string;
	tenant_id: string;
	sync_interval?: number;
	host: "microsoft.com" | "microsoft.us";
}
export const IntegrationsAzureIdpPostInput = /*@__PURE__*/ Schema.Struct({
	group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	user_group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	connector_id: Schema.optional(Schema.String),
	client_secret: SensitiveString,
	client_id: Schema.String,
	tenant_id: Schema.String,
	sync_interval: Schema.optional(Schema.Number),
	host: Schema.Literals(["microsoft.com", "microsoft.us"]),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/azure-idp" }),
) as unknown as Schema.Codec<IntegrationsAzureIdpPostInput>;

// Output Schema
export interface IntegrationsAzureIdpPostOutput {
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	client_id: string;
	tenant_id: string;
	sync_interval: number;
	host: string;
	last_synced_at: string;
}
export const IntegrationsAzureIdpPostOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	client_id: Schema.String,
	tenant_id: Schema.String,
	sync_interval: Schema.Number,
	host: Schema.String,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsAzureIdpPostOutput>;

// The operation
/**
 * Create Azure IDP Integration
 *
 * Creates a new Azure AD IDP integration
 */
export const integrationsAzureIdpPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsAzureIdpPostInput,
	outputSchema: IntegrationsAzureIdpPostOutput,
	errors: [BadRequest] as const,
}));
