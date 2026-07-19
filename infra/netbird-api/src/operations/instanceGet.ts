import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface InstanceGetInput {}
export const InstanceGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/instance" }),
) as unknown as Schema.Codec<InstanceGetInput>;

// Output Schema
export interface InstanceGetOutput {
	setup_required: boolean;
}
export const InstanceGetOutput = /*@__PURE__*/ Schema.Struct({
	setup_required: Schema.Boolean,
}) as unknown as Schema.Codec<InstanceGetOutput>;

// The operation
/**
 * Get Instance Status
 *
 * Returns the instance status including whether initial setup is required. This endpoint does not require authentication.
 */
export const instanceGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: InstanceGetInput,
	outputSchema: InstanceGetOutput,
}));
