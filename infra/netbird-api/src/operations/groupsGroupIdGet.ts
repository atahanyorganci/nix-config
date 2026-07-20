import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface GroupsGroupIdGetInput {
	groupId: string;
}
export const GroupsGroupIdGetInput = /*@__PURE__*/ Schema.Struct({
	groupId: Schema.String.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/api/groups/{groupId}" })) as unknown as Schema.Codec<GroupsGroupIdGetInput>;

// Output Schema
export interface GroupsGroupIdGetOutput {
	id: string;
	name: string;
	peers_count: number;
	resources_count: number;
	issued?: "api" | "integration" | "jwt";
	peers: ReadonlyArray<{ id: string; name: string }> | null;
	resources: ReadonlyArray<{ id: string; type: {} }> | null;
}
export const GroupsGroupIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<GroupsGroupIdGetOutput>;

// The operation
/**
 * Retrieve a Group
 *
 * Get information about a group
 *
 * @param groupId - The unique identifier of a group
 */
export const groupsGroupIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: GroupsGroupIdGetInput,
	outputSchema: GroupsGroupIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
