import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FirewallsIdPutInput {
	id: number;
	name?: string;
	labels?: Record<string, string>;
}
export const FirewallsIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	name: Schema.optional(Schema.String),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "PUT", path: "/firewalls/{id}" })) as unknown as Schema.Codec<FirewallsIdPutInput>;

// Output Schema
export interface FirewallsIdPutOutput {
	firewall: {
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
}
export const FirewallsIdPutOutput = /*@__PURE__*/ Schema.Struct({
	firewall: Schema.Struct({
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
}) as unknown as Schema.Codec<FirewallsIdPutOutput>;

// The operation
/**
 * Update a Firewall
 *
 * Update a [Firewall](#tag/firewalls).
 * In case of a parallel running change on the [Firewall](#tag/firewalls) a `conflict` error will be returned.
 *
 * @param id - ID of the Firewall.
 */
export const firewallsIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: FirewallsIdPutInput,
	outputSchema: FirewallsIdPutOutput,
}));
