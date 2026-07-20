import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ImagesIdPutInput {
	id: number;
	description?: string;
	type?: "snapshot";
	labels?: Record<string, string>;
}
export const ImagesIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	description: Schema.optional(Schema.String),
	type: Schema.optional(Schema.Literals(["snapshot"])),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "PUT", path: "/images/{id}" })) as unknown as Schema.Codec<ImagesIdPutInput>;

// Output Schema
export interface ImagesIdPutOutput {
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
}
export const ImagesIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ImagesIdPutOutput>;

// The operation
/**
 * Update an Image
 *
 * Updates the Image. You may change the description, convert a Backup Image to a Snapshot Image or change the Image labels. Only Images of type `snapshot` and `backup` can be updated.
 *
 * @param id - ID of the Image.
 */
export const imagesIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: ImagesIdPutInput,
	outputSchema: ImagesIdPutOutput,
}));
