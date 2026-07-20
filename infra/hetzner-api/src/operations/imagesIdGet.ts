import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ImagesIdGetInput {
	id: number;
}
export const ImagesIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/images/{id}" })) as unknown as Schema.Codec<ImagesIdGetInput>;

// Output Schema
export interface ImagesIdGetOutput {
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
export const ImagesIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ImagesIdGetOutput>;

// The operation
/**
 * Get an Image
 *
 * Returns a specific Image object.
 *
 * @param id - ID of the Image.
 */
export const imagesIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ImagesIdGetInput,
	outputSchema: ImagesIdGetOutput,
}));
