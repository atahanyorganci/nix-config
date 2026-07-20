import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FirewallsIdActionsRemoveFromResourcesPostInput {
	id: number;
	remove_from: ReadonlyArray<{
		type: "server" | "label_selector";
		server?: { id: number };
		label_selector?: { selector: string };
	}>;
}
export const FirewallsIdActionsRemoveFromResourcesPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	remove_from: Schema.Array(
		Schema.Struct({
			type: Schema.Literals(["server", "label_selector"]),
			server: Schema.optional(
				Schema.Struct({
					id: Schema.Number,
				}),
			),
			label_selector: Schema.optional(
				Schema.Struct({
					selector: Schema.String,
				}),
			),
		}),
	),
}).pipe(
	T.Http({ method: "POST", path: "/firewalls/{id}/actions/remove_from_resources" }),
) as unknown as Schema.Codec<FirewallsIdActionsRemoveFromResourcesPostInput>;

// Output Schema
export interface FirewallsIdActionsRemoveFromResourcesPostOutput {
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
export const FirewallsIdActionsRemoveFromResourcesPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<FirewallsIdActionsRemoveFromResourcesPostOutput>;

// The operation
/**
 * Remove from Resources
 *
 * Removes a [Firewall](#tag/firewalls) from multiple resources.
 * Supported resources:
 * - [Servers](#tag/servers) (with a public network interface)
 * A [Firewall](#tag/firewalls) is removed from a resource once the related [Action](#tag/actions) with command `remove_firewall` successfully finished.
 * #### Operation specific errors
 *
 * @param id - ID of the Firewall.
 */
export const firewallsIdActionsRemoveFromResourcesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: FirewallsIdActionsRemoveFromResourcesPostInput,
	outputSchema: FirewallsIdActionsRemoveFromResourcesPostOutput,
}));
