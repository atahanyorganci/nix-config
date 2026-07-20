import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ActionsGetInput {
	id: ReadonlyArray<number>;
}
export const ActionsGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Array(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/actions" })) as unknown as Schema.Codec<ActionsGetInput>;

// Output Schema
export interface ActionsGetOutput {
	actions: ReadonlyArray<{
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	}>;
}
export const ActionsGetOutput = /*@__PURE__*/ Schema.Struct({
	actions: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			command: Schema.String,
			status: Schema.Literals(["running", "success", "error"]),
			started: Schema.String,
			finished: Schema.NullOr(Schema.String),
			progress: Schema.Number,
			resources: Schema.Array(
				Schema.Struct({
					id: Schema.Number,
					type: Schema.String,
				}),
			),
			error: Schema.NullOr(
				Schema.Struct({
					code: Schema.String,
					message: Schema.String,
				}),
			),
		}),
	),
}) as unknown as Schema.Codec<ActionsGetOutput>;

// The operation
/**
 * Get multiple Actions
 *
 * Returns multiple Action objects specified by the `id` parameter.
 * **Note**: This endpoint previously allowed listing all actions in the project. This functionality was deprecated in July 2023 and removed on 30 January 2025.
 * - Announcement: https://docs.hetzner.cloud/changelog#2023-07-20-actions-list-endpoint-is-deprecated
 * - Removal: https://docs.hetzner.cloud/changelog#2025-01-30-listing-arbitrary-actions-in-the-actions-list-endpoint-is-removed
 *
 * @param id - Filter the actions by ID. May be used multiple times.

The response will only contain actions matching the specified IDs.

 */
export const actionsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ActionsGetInput,
	outputSchema: ActionsGetOutput,
}));
