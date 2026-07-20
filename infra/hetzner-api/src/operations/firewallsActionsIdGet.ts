import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FirewallsActionsIdGetInput {
	id: number;
}
export const FirewallsActionsIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/firewalls/actions/{id}" }),
) as unknown as Schema.Codec<FirewallsActionsIdGetInput>;

// Output Schema
export interface FirewallsActionsIdGetOutput {
	action: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	};
}
export const FirewallsActionsIdGetOutput = /*@__PURE__*/ Schema.Struct({
	action: Schema.Struct({
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
}) as unknown as Schema.Codec<FirewallsActionsIdGetOutput>;

// The operation
/**
 * Get an Action
 *
 * Returns the specific [Action](#tag/actions).
 *
 * @param id - ID of the Action.
 */
export const firewallsActionsIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: FirewallsActionsIdGetInput,
	outputSchema: FirewallsActionsIdGetOutput,
}));
