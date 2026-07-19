import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PoliciesPolicyIdDeleteInput {
	policyId: string;
}
export const PoliciesPolicyIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	policyId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/policies/{policyId}" }),
) as unknown as Schema.Codec<PoliciesPolicyIdDeleteInput>;

// Output Schema
export type PoliciesPolicyIdDeleteOutput = void;
export const PoliciesPolicyIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<PoliciesPolicyIdDeleteOutput>;

// The operation
/**
 * Delete a Policy
 *
 * Delete a policy
 *
 * @param policyId - The unique identifier of a policy
 */
export const policiesPolicyIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: PoliciesPolicyIdDeleteInput,
	outputSchema: PoliciesPolicyIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
