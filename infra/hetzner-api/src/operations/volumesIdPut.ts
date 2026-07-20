import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface VolumesIdPutInput {
	id: number;
	name?: string;
	labels?: Record<string, string>;
}
export const VolumesIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	name: Schema.optional(Schema.String),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "PUT", path: "/volumes/{id}" })) as unknown as Schema.Codec<VolumesIdPutInput>;

// Output Schema
export interface VolumesIdPutOutput {
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
}
export const VolumesIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<VolumesIdPutOutput>;

// The operation
/**
 * Update a Volume
 *
 * Updates the Volume properties.
 *
 * @param id - ID of the Volume.
 */
export const volumesIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: VolumesIdPutInput,
	outputSchema: VolumesIdPutOutput,
}));
