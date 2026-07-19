import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ReverseProxiesClustersClusterAddressDeleteInput {
	clusterAddress: string;
}
export const ReverseProxiesClustersClusterAddressDeleteInput = /*@__PURE__*/ Schema.Struct({
	clusterAddress: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/reverse-proxies/clusters/{clusterAddress}" }),
) as unknown as Schema.Codec<ReverseProxiesClustersClusterAddressDeleteInput>;

// Output Schema
export type ReverseProxiesClustersClusterAddressDeleteOutput = void;
export const ReverseProxiesClustersClusterAddressDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<ReverseProxiesClustersClusterAddressDeleteOutput>;

// The operation
/**
 * Delete a self-hosted proxy cluster
 *
 * Removes all self-hosted (BYOP) proxy registrations for the given cluster address owned by the account.
 *
 * @param clusterAddress - The address of the proxy cluster
 */
export const reverseProxiesClustersClusterAddressDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: ReverseProxiesClustersClusterAddressDeleteInput,
	outputSchema: ReverseProxiesClustersClusterAddressDeleteOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
