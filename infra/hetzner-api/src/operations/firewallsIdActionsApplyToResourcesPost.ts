import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FirewallsIdActionsApplyToResourcesPostInput {
	id: number;
	apply_to: ReadonlyArray<{
		type: "server" | "label_selector";
		server?: { id: number };
		label_selector?: { selector: string };
	}>;
}
export const FirewallsIdActionsApplyToResourcesPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	apply_to: Schema.Array(
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
	T.Http({ method: "POST", path: "/firewalls/{id}/actions/apply_to_resources" }),
) as unknown as Schema.Codec<FirewallsIdActionsApplyToResourcesPostInput>;

// Output Schema
export interface FirewallsIdActionsApplyToResourcesPostOutput {
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
export const FirewallsIdActionsApplyToResourcesPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<FirewallsIdActionsApplyToResourcesPostOutput>;

// The operation
/**
 * Apply to Resources
 *
 * Applies a [Firewall](#tag/firewalls) to multiple resources.
 * Supported resources:
 * - [Servers](#tag/servers) (with a public network interface)
 * - [Label Selectors](#description/label-selector)
 * A [Server](#tag/servers) can be applied to [a maximum of 5 Firewalls](https://docs.hetzner.com/cloud/firewalls/overview#limits). This limit
 * applies to [Servers](#tag/servers) applied via a matching [Label Selector](#description/label-selector) as well.
 * Updates to resources matching or no longer matching a [Label Selector](#description/label-selector) can take up to a few seconds
 * to be processed.
 * A [Firewall](#tag/firewalls) is applied to a resource once the related [Action](#tag/actions) with command `apply_firewall` successfully finished.
 * #### Operation specific errors
 *
 * @param id - ID of the Firewall.
 */
export const firewallsIdActionsApplyToResourcesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: FirewallsIdActionsApplyToResourcesPostInput,
	outputSchema: FirewallsIdActionsApplyToResourcesPostOutput,
}));
