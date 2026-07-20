import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsChangeAliasIpsPostInput {
	id: number;
	network: number;
	alias_ips: ReadonlyArray<string>;
}
export const ServersIdActionsChangeAliasIpsPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	network: Schema.Number,
	alias_ips: Schema.Array(Schema.String),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/change_alias_ips" }),
) as unknown as Schema.Codec<ServersIdActionsChangeAliasIpsPostInput>;

// Output Schema
export interface ServersIdActionsChangeAliasIpsPostOutput {
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
export const ServersIdActionsChangeAliasIpsPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsChangeAliasIpsPostOutput>;

// The operation
/**
 * Change alias IPs of a Network
 *
 * Changes the alias IPs of an already attached Network. Note that the existing aliases for the specified Network will be replaced with these provided in the request body. So if you want to add an alias IP, you have to provide the existing ones from the Network plus the new alias IP in the request body.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsChangeAliasIpsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsChangeAliasIpsPostInput,
	outputSchema: ServersIdActionsChangeAliasIpsPostOutput,
}));
