import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface GroupsGroupIdPutInput {
	groupId: string;
	name: string;
	peers?: ReadonlyArray<string>;
	resources?: ReadonlyArray<{ id: string; type: {} }>;
}
export const GroupsGroupIdPutInput = /*@__PURE__*/ Schema.Struct({
	groupId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	peers: Schema.optional(Schema.Array(Schema.String)),
	resources: Schema.optional(
		Schema.Array(
			Schema.Struct({
				id: Schema.String,
				type: Schema.Struct({}),
			}),
		),
	),
}).pipe(T.Http({ method: "PUT", path: "/api/groups/{groupId}" })) as unknown as Schema.Codec<GroupsGroupIdPutInput>;

// Output Schema
export interface GroupsGroupIdPutOutput {
	id: string;
	name: string;
	peers_count: number;
	resources_count: number;
	issued?: "api" | "integration" | "jwt";
	peers: ReadonlyArray<{ id: string; name: string }> | null;
	resources: ReadonlyArray<{ id: string; type: {} }> | null;
}
export const GroupsGroupIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<GroupsGroupIdPutOutput>;

// The operation
/**
 * Update a Group
 *
 * Update/Replace a group
 *
 * @param groupId - The unique identifier of a group
 */
export const groupsGroupIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: GroupsGroupIdPutInput,
	outputSchema: GroupsGroupIdPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
