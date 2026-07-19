import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsBillingUsageGetInput {}
export const IntegrationsBillingUsageGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/billing/usage" }),
) as unknown as Schema.Codec<IntegrationsBillingUsageGetInput>;

// Output Schema
export interface IntegrationsBillingUsageGetOutput {
	active_users: number;
	total_users: number;
	active_peers: number;
	total_peers: number;
}
export const IntegrationsBillingUsageGetOutput = /*@__PURE__*/ Schema.Struct({
	active_users: Schema.Number,
	total_users: Schema.Number,
	active_peers: Schema.Number,
	total_peers: Schema.Number,
}) as unknown as Schema.Codec<IntegrationsBillingUsageGetOutput>;

// The operation
/**
 * Get current usage
 */
export const integrationsBillingUsageGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsBillingUsageGetInput,
	outputSchema: IntegrationsBillingUsageGetOutput,
}));
