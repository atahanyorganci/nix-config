import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FirewallsPostInput {
	name: string;
	labels?: Record<string, string>;
	rules?: ReadonlyArray<{
		description?: string | null;
		direction: "in" | "out";
		source_ips?: ReadonlyArray<string>;
		destination_ips?: ReadonlyArray<string>;
		protocol: "tcp" | "udp" | "icmp" | "esp" | "gre";
		port?: string;
	}>;
	apply_to?: ReadonlyArray<{
		type: "server" | "label_selector";
		server?: { id: number };
		label_selector?: { selector: string };
	}>;
}
export const FirewallsPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	rules: Schema.optional(
		Schema.Array(
			Schema.Struct({
				description: Schema.optional(Schema.NullOr(Schema.String)),
				direction: Schema.Literals(["in", "out"]),
				source_ips: Schema.optional(Schema.Array(Schema.String)),
				destination_ips: Schema.optional(Schema.Array(Schema.String)),
				protocol: Schema.Literals(["tcp", "udp", "icmp", "esp", "gre"]),
				port: Schema.optional(Schema.String),
			}),
		),
	),
	apply_to: Schema.optional(
		Schema.Array(
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
	),
}).pipe(T.Http({ method: "POST", path: "/firewalls" })) as unknown as Schema.Codec<FirewallsPostInput>;

// Output Schema
export interface FirewallsPostOutput {
	firewall?: {
		id: number;
		name: string;
		labels?: Record<string, string>;
		created: string;
		rules: ReadonlyArray<{
			description?: string | null;
			direction: "in" | "out";
			source_ips: ReadonlyArray<string>;
			destination_ips: ReadonlyArray<string>;
			protocol: "tcp" | "udp" | "icmp" | "esp" | "gre";
			port: string | null;
		}>;
		applied_to: ReadonlyArray<{
			type: "server" | "label_selector";
			server?: { id: number };
			label_selector?: { selector: string };
			applied_to_resources?: ReadonlyArray<{ type?: "server"; server?: { id: number } }>;
		}>;
	};
	actions?: ReadonlyArray<{
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
export const FirewallsPostOutput = /*@__PURE__*/ Schema.Struct({
	firewall: Schema.optional(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
			created: Schema.String,
			rules: Schema.Array(
				Schema.Struct({
					description: Schema.optional(Schema.NullOr(Schema.String)),
					direction: Schema.Literals(["in", "out"]),
					source_ips: Schema.Array(Schema.String),
					destination_ips: Schema.Array(Schema.String),
					protocol: Schema.Literals(["tcp", "udp", "icmp", "esp", "gre"]),
					port: Schema.NullOr(Schema.String),
				}),
			),
			applied_to: Schema.Array(
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
					applied_to_resources: Schema.optional(
						Schema.Array(
							Schema.Struct({
								type: Schema.optional(Schema.Literals(["server"])),
								server: Schema.optional(
									Schema.Struct({
										id: Schema.Number,
									}),
								),
							}),
						),
					),
				}),
			),
		}),
	),
	actions: Schema.optional(
		Schema.Array(
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
	),
}) as unknown as Schema.Codec<FirewallsPostOutput>;

// The operation
/**
 * Create a Firewall
 *
 * Create a [Firewall](#tag/firewalls).
 * #### Operation specific errors
 */
export const firewallsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: FirewallsPostInput,
	outputSchema: FirewallsPostOutput,
}));
