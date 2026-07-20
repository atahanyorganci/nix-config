import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameActionsGetInput {
	idOrName: string;
	sort?: ReadonlyArray<
		| "id"
		| "id:asc"
		| "id:desc"
		| "command"
		| "command:asc"
		| "command:desc"
		| "status"
		| "status:asc"
		| "status:desc"
		| "started"
		| "started:asc"
		| "started:desc"
		| "finished"
		| "finished:asc"
		| "finished:desc"
	>;
	status?: ReadonlyArray<"running" | "success" | "error">;
	page?: number;
	perPage?: number;
}
export const ZonesIdOrNameActionsGetInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
	sort: Schema.optional(
		Schema.Array(
			Schema.Literals([
				"id",
				"id:asc",
				"id:desc",
				"command",
				"command:asc",
				"command:desc",
				"status",
				"status:asc",
				"status:desc",
				"started",
				"started:asc",
				"started:desc",
				"finished",
				"finished:asc",
				"finished:desc",
			]),
		),
	),
	status: Schema.optional(Schema.Array(Schema.Literals(["running", "success", "error"]))),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(
	T.Http({ method: "GET", path: "/zones/{idOrName}/actions" }),
) as unknown as Schema.Codec<ZonesIdOrNameActionsGetInput>;

// Output Schema
export interface ZonesIdOrNameActionsGetOutput {
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
	meta: {
		pagination: {
			page: number;
			per_page: number;
			previous_page: number | null;
			next_page: number | null;
			last_page: number | null;
			total_entries: number | null;
		};
	};
}
export const ZonesIdOrNameActionsGetOutput = /*@__PURE__*/ Schema.Struct({
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
	meta: Schema.Struct({
		pagination: Schema.Struct({
			page: Schema.Number,
			per_page: Schema.Number,
			previous_page: Schema.NullOr(Schema.Number),
			next_page: Schema.NullOr(Schema.Number),
			last_page: Schema.NullOr(Schema.Number),
			total_entries: Schema.NullOr(Schema.Number),
		}),
	}),
}) as unknown as Schema.Codec<ZonesIdOrNameActionsGetOutput>;

// The operation
/**
 * List Actions for a Zone
 *
 * Returns all [Actions](#tag/actions) for a [Zone](#tag/zones).
 * Use the provided URI parameters to modify the result.
 *
 * @param idOrName - ID or Name of the Zone.
 * @param sort - Sort actions by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param status - Filter the actions by status. May be used multiple times.

The response will only contain actions matching the specified statuses.

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const zonesIdOrNameActionsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameActionsGetInput,
	outputSchema: ZonesIdOrNameActionsGetOutput,
}));
