import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { SensitiveOutputString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface ServersIdActionsEnableRescuePostInput {
	id: number;
	type?: "linux64";
	ssh_keys?: ReadonlyArray<number>;
}
export const ServersIdActionsEnableRescuePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	type: Schema.optional(Schema.Literals(["linux64"])),
	ssh_keys: Schema.optional(Schema.Array(Schema.Number)),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/enable_rescue" }),
) as unknown as Schema.Codec<ServersIdActionsEnableRescuePostInput>;

// Output Schema
export interface ServersIdActionsEnableRescuePostOutput {
	root_password?: Redacted.Redacted<string>;
	action?: {
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
export const ServersIdActionsEnableRescuePostOutput = /*@__PURE__*/ Schema.Struct({
	root_password: Schema.optional(SensitiveOutputString),
	action: Schema.optional(
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
}) as unknown as Schema.Codec<ServersIdActionsEnableRescuePostOutput>;

// The operation
/**
 * Enable Rescue Mode for a Server
 *
 * Enable the Hetzner Rescue System for this Server. The next time a Server with enabled rescue mode boots it will start a special minimal Linux distribution designed for repair and reinstall.
 * In case a Server cannot boot on its own you can use this to access a Server’s disks.
 * Rescue Mode is automatically disabled when you first boot into it or if you do not use it for 60 minutes.
 * Enabling rescue mode will not [reboot](https://docs.hetzner.cloud/#server-actions-soft-reboot-a-server) your Server — you will have to do this yourself.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsEnableRescuePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsEnableRescuePostInput,
	outputSchema: ServersIdActionsEnableRescuePostOutput,
}));
