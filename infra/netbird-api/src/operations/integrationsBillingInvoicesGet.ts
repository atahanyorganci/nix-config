import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingInvoicesGetInput {}
export const IntegrationsBillingInvoicesGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/billing/invoices" }),
) as unknown as Schema.Codec<IntegrationsBillingInvoicesGetInput>;

// Output Schema
export type IntegrationsBillingInvoicesGetOutput = ReadonlyArray<{
	id: string;
	type: "account" | "tenants";
	period_start: string;
	period_end: string;
}>;
export const IntegrationsBillingInvoicesGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		type: Schema.Literals(["account", "tenants"]),
		period_start: Schema.String,
		period_end: Schema.String,
	}),
) as unknown as Schema.Codec<IntegrationsBillingInvoicesGetOutput>;

// The operation
/**
 * Get account's paid invoices
 */
export const integrationsBillingInvoicesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingInvoicesGetInput,
	outputSchema: IntegrationsBillingInvoicesGetOutput,
	errors: [BadRequest] as const,
}));
