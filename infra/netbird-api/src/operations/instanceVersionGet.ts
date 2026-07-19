import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface InstanceVersionGetInput {}
export const InstanceVersionGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/instance/version" }),
) as unknown as Schema.Codec<InstanceVersionGetInput>;

// Output Schema
export interface InstanceVersionGetOutput {
	management_current_version: string;
	dashboard_available_version?: string;
	management_available_version?: string;
	management_update_available: boolean;
}
export const InstanceVersionGetOutput = /*@__PURE__*/ Schema.Struct({
	management_current_version: Schema.String,
	dashboard_available_version: Schema.optional(Schema.String),
	management_available_version: Schema.optional(Schema.String),
	management_update_available: Schema.Boolean,
}) as unknown as Schema.Codec<InstanceVersionGetOutput>;

// The operation
/**
 * Get Version Info
 *
 * Returns version information for NetBird components including the current management server version and latest available versions from GitHub.
 */
export const instanceVersionGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: InstanceVersionGetInput,
	outputSchema: InstanceVersionGetOutput,
	errors: [Forbidden] as const,
}));
