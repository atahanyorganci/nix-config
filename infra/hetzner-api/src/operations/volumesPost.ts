import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface VolumesPostInput {
	size: number;
	name: string;
	labels?: Record<string, string>;
	automount?: boolean;
	format?: string;
	location?: string;
	server?: number;
}
export const VolumesPostInput = /*@__PURE__*/ Schema.Struct({
	size: Schema.Number,
	name: Schema.String,
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	automount: Schema.optional(Schema.Boolean),
	format: Schema.optional(Schema.String),
	location: Schema.optional(Schema.String),
	server: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "POST", path: "/volumes" })) as unknown as Schema.Codec<VolumesPostInput>;

// Output Schema
export interface VolumesPostOutput {
	volume: {
		id: number;
		created: string;
		name: string;
		server: number | null;
		location: {
			id: number;
			name: string;
			description: string;
			country: string;
			city: string;
			latitude: number;
			longitude: number;
			network_zone: string;
		};
		size: number;
		linux_device: string;
		protection: { delete: boolean };
		labels: Record<string, string>;
		status: "available" | "creating";
		format: string | null;
	};
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
	next_actions: ReadonlyArray<{
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
export const VolumesPostOutput = /*@__PURE__*/ Schema.Struct({
	volume: Schema.Struct({
		id: Schema.Number,
		created: Schema.String,
		name: Schema.String,
		server: Schema.NullOr(Schema.Number),
		location: Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			description: Schema.String,
			country: Schema.String,
			city: Schema.String,
			latitude: Schema.Number,
			longitude: Schema.Number,
			network_zone: Schema.String,
		}),
		size: Schema.Number,
		linux_device: Schema.String,
		protection: Schema.Struct({
			delete: Schema.Boolean,
		}),
		labels: Schema.Record(Schema.String, Schema.String),
		status: Schema.Literals(["available", "creating"]),
		format: Schema.NullOr(Schema.String),
	}),
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
	next_actions: Schema.Array(
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
}) as unknown as Schema.Codec<VolumesPostOutput>;

// The operation
/**
 * Create a Volume
 *
 * Creates a new Volume attached to a Server. If you want to create a Volume that is not attached to a Server, you need to provide the `location` key instead of `server`. This can be either the ID or the name of the Location this Volume will be created in. Note that a Volume can be attached to a Server only in the same Location as the Volume itself.
 * Specifying the Server during Volume creation will automatically attach the Volume to that Server after it has been initialized. In that case, the `next_actions` key in the response is an array which contains a single `attach_volume` action.
 * The minimum Volume size is 10GB and the maximum size is 10TB (10240GB).
 * A volume’s name can consist of alphanumeric characters, dashes, underscores, and dots, but has to start and end with an alphanumeric character. The total length is limited to 64 characters. Volume names must be unique per Project.
 * #### Operation specific errors
 */
export const volumesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: VolumesPostInput,
	outputSchema: VolumesPostOutput,
}));
