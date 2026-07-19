import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PostureChecksGetInput {}
export const PostureChecksGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/posture-checks" }),
) as unknown as Schema.Codec<PostureChecksGetInput>;

// Output Schema
export type PostureChecksGetOutput = ReadonlyArray<{
	id: string;
	name: string;
	description?: string;
	checks: {
		nb_version_check?: { min_version: string };
		os_version_check?: {
			android?: { min_version: string };
			darwin?: { min_version: string };
			ios?: { min_version: string };
			linux?: { min_kernel_version: string };
			windows?: { min_kernel_version: string };
		};
		geo_location_check?: {
			locations: ReadonlyArray<{ country_code: string; city_name?: string }>;
			action: "allow" | "deny";
		};
		peer_network_range_check?: { ranges: ReadonlyArray<string>; action: "allow" | "deny" };
		process_check?: { processes: ReadonlyArray<{ linux_path?: string; mac_path?: string; windows_path?: string }> };
	};
}>;
export const PostureChecksGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		description: Schema.optional(Schema.String),
		checks: Schema.Struct({
			nb_version_check: Schema.optional(
				Schema.Struct({
					min_version: Schema.String,
				}),
			),
			os_version_check: Schema.optional(
				Schema.Struct({
					android: Schema.optional(
						Schema.Struct({
							min_version: Schema.String,
						}),
					),
					darwin: Schema.optional(
						Schema.Struct({
							min_version: Schema.String,
						}),
					),
					ios: Schema.optional(
						Schema.Struct({
							min_version: Schema.String,
						}),
					),
					linux: Schema.optional(
						Schema.Struct({
							min_kernel_version: Schema.String,
						}),
					),
					windows: Schema.optional(
						Schema.Struct({
							min_kernel_version: Schema.String,
						}),
					),
				}),
			),
			geo_location_check: Schema.optional(
				Schema.Struct({
					locations: Schema.Array(
						Schema.Struct({
							country_code: Schema.String,
							city_name: Schema.optional(Schema.String),
						}),
					),
					action: Schema.Literals(["allow", "deny"]),
				}),
			),
			peer_network_range_check: Schema.optional(
				Schema.Struct({
					ranges: Schema.Array(Schema.String),
					action: Schema.Literals(["allow", "deny"]),
				}),
			),
			process_check: Schema.optional(
				Schema.Struct({
					processes: Schema.Array(
						Schema.Struct({
							linux_path: Schema.optional(Schema.String),
							mac_path: Schema.optional(Schema.String),
							windows_path: Schema.optional(Schema.String),
						}),
					),
				}),
			),
		}),
	}),
) as unknown as Schema.Codec<PostureChecksGetOutput>;

// The operation
/**
 * List all Posture Checks
 *
 * Returns a list of all posture checks
 */
export const postureChecksGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PostureChecksGetInput,
	outputSchema: PostureChecksGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
