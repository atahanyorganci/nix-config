import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface GroupsPostInput {
	name: string;
	peers?: ReadonlyArray<string>;
	resources?: ReadonlyArray<{ id: string; type: {} }>;
}
export const GroupsPostInput = /*@__PURE__*/ Schema.Struct({
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
}).pipe(T.Http({ method: "POST", path: "/api/groups" })) as unknown as Schema.Codec<GroupsPostInput>;

// Output Schema
export interface GroupsPostOutput {
	id: string;
	name: string;
	peers_count: number;
	resources_count: number;
	issued?: "api" | "integration" | "jwt";
	peers: ReadonlyArray<{ id: string; name: string }>;
	resources: ReadonlyArray<{ id: string; type: {} }>;
}
export const GroupsPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	peers_count: Schema.Number,
	resources_count: Schema.Number,
	issued: Schema.optional(Schema.Literals(["api", "integration", "jwt"])),
	peers: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			name: Schema.String,
		}),
	),
	resources: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			type: Schema.Struct({}),
		}),
	),
}) as unknown as Schema.Codec<GroupsPostOutput>;

// The operation
/**
 * Create a Group
 *
 * Creates a group
 */
export const groupsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: GroupsPostInput,
	outputSchema: GroupsPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
