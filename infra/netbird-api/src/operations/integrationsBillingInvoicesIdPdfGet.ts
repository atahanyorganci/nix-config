import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingInvoicesIdPdfGetInput {
	id: string;
}
export const IntegrationsBillingInvoicesIdPdfGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/billing/invoices/{id}/pdf" }),
) as unknown as Schema.Codec<IntegrationsBillingInvoicesIdPdfGetInput>;

// Output Schema
export interface IntegrationsBillingInvoicesIdPdfGetOutput {
	url: string;
}
export const IntegrationsBillingInvoicesIdPdfGetOutput = /*@__PURE__*/ Schema.Struct({
	url: Schema.String,
}) as unknown as Schema.Codec<IntegrationsBillingInvoicesIdPdfGetOutput>;

// The operation
/**
 * Get account invoice URL to Stripe.
 *
 * @param id - The unique identifier of the invoice
 */
export const integrationsBillingInvoicesIdPdfGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingInvoicesIdPdfGetInput,
	outputSchema: IntegrationsBillingInvoicesIdPdfGetOutput,
	errors: [BadRequest] as const,
}));
