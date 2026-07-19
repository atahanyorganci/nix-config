import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface GroupsGroupIdDeleteInput {
	groupId: string;
}
export const GroupsGroupIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	groupId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/groups/{groupId}" }),
) as unknown as Schema.Codec<GroupsGroupIdDeleteInput>;

// Output Schema
export type GroupsGroupIdDeleteOutput = void;
export const GroupsGroupIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<GroupsGroupIdDeleteOutput>;

// The operation
/**
 * Delete a Group
 *
 * Delete a group
 *
 * @param groupId - The unique identifier of a group
 */
export const groupsGroupIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: GroupsGroupIdDeleteInput,
	outputSchema: GroupsGroupIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
