import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FirewallsIdActionsSetRulesPostInput {
	id: number;
	rules: ReadonlyArray<{
		description?: string | null;
		direction: "in" | "out";
		source_ips?: ReadonlyArray<string>;
		destination_ips?: ReadonlyArray<string>;
		protocol: "tcp" | "udp" | "icmp" | "esp" | "gre";
		port?: string;
	}>;
}
export const FirewallsIdActionsSetRulesPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	rules: Schema.Array(
		Schema.Struct({
			description: Schema.optional(Schema.NullOr(Schema.String)),
			direction: Schema.Literals(["in", "out"]),
			source_ips: Schema.optional(Schema.Array(Schema.String)),
			destination_ips: Schema.optional(Schema.Array(Schema.String)),
			protocol: Schema.Literals(["tcp", "udp", "icmp", "esp", "gre"]),
			port: Schema.optional(Schema.String),
		}),
	),
}).pipe(
	T.Http({ method: "POST", path: "/firewalls/{id}/actions/set_rules" }),
) as unknown as Schema.Codec<FirewallsIdActionsSetRulesPostInput>;

// Output Schema
export interface FirewallsIdActionsSetRulesPostOutput {
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
export const FirewallsIdActionsSetRulesPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<FirewallsIdActionsSetRulesPostOutput>;

// The operation
/**
 * Set Rules
 *
 * Set the rules of a [Firewall](#tag/firewalls).
 * Overwrites the existing rules with the given ones. Pass an empty array to remove all rules.
 * Rules are limited to 50 entries per [Firewall](#tag/firewalls) and [500 effective rules](https://docs.hetzner.com/cloud/firewalls/overview#limits).
 *
 * @param id - ID of the Firewall.
 */
export const firewallsIdActionsSetRulesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: FirewallsIdActionsSetRulesPostInput,
	outputSchema: FirewallsIdActionsSetRulesPostOutput,
}));
