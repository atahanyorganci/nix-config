import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface VolumesIdDeleteInput {
	id: number;
}
export const VolumesIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/volumes/{id}" })) as unknown as Schema.Codec<VolumesIdDeleteInput>;

// Output Schema
export type VolumesIdDeleteOutput = void;
export const VolumesIdDeleteOutput = /*@__PURE__*/ Schema.Void as unknown as Schema.Codec<VolumesIdDeleteOutput>;

// The operation
/**
 * Delete a Volume
 *
 * Deletes a volume. All Volume data is irreversibly destroyed. The Volume must not be attached to a Server and it must not have delete protection enabled.
 *
 * @param id - ID of the Volume.
 */
export const volumesIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: VolumesIdDeleteInput,
	outputSchema: VolumesIdDeleteOutput,
}));
