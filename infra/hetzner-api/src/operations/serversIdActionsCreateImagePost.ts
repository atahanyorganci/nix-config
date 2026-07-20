import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsCreateImagePostInput {
	id: number;
	description?: string;
	type?: "snapshot" | "backup";
	labels?: Record<string, string>;
}
export const ServersIdActionsCreateImagePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	description: Schema.optional(Schema.String),
	type: Schema.optional(Schema.Literals(["snapshot", "backup"])),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/create_image" }),
) as unknown as Schema.Codec<ServersIdActionsCreateImagePostInput>;

// Output Schema
export interface ServersIdActionsCreateImagePostOutput {
	image?: {
		id: number;
		type: "system" | "app" | "snapshot" | "backup";
		status: "available" | "creating" | "unavailable";
		name: string | null;
		description: string;
		image_size: number | null;
		disk_size: number;
		created: string;
		created_from: { id: number; name: string } | null;
		bound_to: number | null;
		os_flavor: "ubuntu" | "centos" | "debian" | "fedora" | "rocky" | "alma" | "opensuse" | "unknown";
		os_version: string | null;
		rapid_deploy?: boolean;
		protection: { delete: boolean };
		deprecated: string | null;
		deleted: string | null;
		labels: Record<string, string>;
		architecture: "x86" | "arm";
	};
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
export const ServersIdActionsCreateImagePostOutput = /*@__PURE__*/ Schema.Struct({
	image: Schema.optional(
		Schema.Struct({
			id: Schema.Number,
			type: Schema.Literals(["system", "app", "snapshot", "backup"]),
			status: Schema.Literals(["available", "creating", "unavailable"]),
			name: Schema.NullOr(Schema.String),
			description: Schema.String,
			image_size: Schema.NullOr(Schema.Number),
			disk_size: Schema.Number,
			created: Schema.String,
			created_from: Schema.NullOr(
				Schema.Struct({
					id: Schema.Number,
					name: Schema.String,
				}),
			),
			bound_to: Schema.NullOr(Schema.Number),
			os_flavor: Schema.Literals(["ubuntu", "centos", "debian", "fedora", "rocky", "alma", "opensuse", "unknown"]),
			os_version: Schema.NullOr(Schema.String),
			rapid_deploy: Schema.optional(Schema.Boolean),
			protection: Schema.Struct({
				delete: Schema.Boolean,
			}),
			deprecated: Schema.NullOr(Schema.String),
			deleted: Schema.NullOr(Schema.String),
			labels: Schema.Record(Schema.String, Schema.String),
			architecture: Schema.Literals(["x86", "arm"]),
		}),
	),
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
}) as unknown as Schema.Codec<ServersIdActionsCreateImagePostOutput>;

// The operation
/**
 * Create Image from a Server
 *
 * Creates an Image (snapshot) from a Server by copying the contents of its disks. This creates a snapshot of the current state of the disk and copies it into an Image. If the Server is currently running you must make sure that its disk content is consistent. Otherwise, the created Image may not be readable.
 * To make sure disk content is consistent, we recommend to shut down the Server prior to creating an Image.
 * You can either create a `backup` Image that is bound to the Server and therefore will be deleted when the Server is deleted, or you can create a `snapshot` Image which is completely independent of the Server it was created from and will survive Server deletion. Backup Images are only available when the backup option is enabled for the Server. Snapshot Images are billed on a per GB basis.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsCreateImagePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsCreateImagePostInput,
	outputSchema: ServersIdActionsCreateImagePostOutput,
}));
