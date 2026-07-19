import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkProvidersProviderIdDeleteInput {
	providerId: string;
}
export const AgentNetworkProvidersProviderIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	providerId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/agent-network/providers/{providerId}" }),
) as unknown as Schema.Codec<AgentNetworkProvidersProviderIdDeleteInput>;

// Output Schema
export type AgentNetworkProvidersProviderIdDeleteOutput = void;
export const AgentNetworkProvidersProviderIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<AgentNetworkProvidersProviderIdDeleteOutput>;

// The operation
/**
 * Delete an Agent Network Provider
 *
 * Delete an existing Agent Network AI provider.
 *
 * @param providerId - The unique identifier of an Agent Network provider
 */
export const agentNetworkProvidersProviderIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkProvidersProviderIdDeleteInput,
	outputSchema: AgentNetworkProvidersProviderIdDeleteOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
