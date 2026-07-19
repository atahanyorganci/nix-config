import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingInvoicesIdCsvGetInput {
	id: string;
}
export const IntegrationsBillingInvoicesIdCsvGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/billing/invoices/{id}/csv" }),
) as unknown as Schema.Codec<IntegrationsBillingInvoicesIdCsvGetInput>;

// Output Schema
export type IntegrationsBillingInvoicesIdCsvGetOutput = void;
export const IntegrationsBillingInvoicesIdCsvGetOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IntegrationsBillingInvoicesIdCsvGetOutput>;

// The operation
/**
 * Get account invoice CSV.
 *
 * @param id - The unique identifier of the invoice
 */
export const integrationsBillingInvoicesIdCsvGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingInvoicesIdCsvGetInput,
	outputSchema: IntegrationsBillingInvoicesIdCsvGetOutput,
	errors: [BadRequest] as const,
}));
