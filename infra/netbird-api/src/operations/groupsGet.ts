import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface GroupsGetInput {
	name?: string;
}
export const GroupsGetInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.optional(Schema.String),
}).pipe(T.Http({ method: "GET", path: "/api/groups" })) as unknown as Schema.Codec<GroupsGetInput>;

// Output Schema
export type GroupsGetOutput = ReadonlyArray<{
	id: string;
	name: string;
	peers_count: number;
	resources_count: number;
	issued?: "api" | "integration" | "jwt";
	peers: ReadonlyArray<{ id: string; name: string }> | null;
	resources: ReadonlyArray<{ id: string; type: {} }> | null;
}>;
export const GroupsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		peers_count: Schema.Number,
		resources_count: Schema.Number,
		issued: Schema.optional(Schema.Literals(["api", "integration", "jwt"])),
		peers: Schema.NullOr(
			Schema.Array(
				Schema.Struct({
					id: Schema.String,
					name: Schema.String,
				}),
			),
		),
		resources: Schema.NullOr(
			Schema.Array(
				Schema.Struct({
					id: Schema.String,
					type: Schema.Struct({}),
				}),
			),
		),
	}),
) as unknown as Schema.Codec<GroupsGetOutput>;

// The operation
/**
 * List all Groups
 *
 * Returns a list of all groups
 *
 * @param name - Filter groups by name (exact match)
 */
export const groupsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: GroupsGetInput,
	outputSchema: GroupsGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
