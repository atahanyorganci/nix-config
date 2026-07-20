import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface SshKeysIdDeleteInput {
	id: number;
}
export const SshKeysIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/ssh_keys/{id}" })) as unknown as Schema.Codec<SshKeysIdDeleteInput>;

// Output Schema
export type SshKeysIdDeleteOutput = void;
export const SshKeysIdDeleteOutput = /*@__PURE__*/ Schema.Void as unknown as Schema.Codec<SshKeysIdDeleteOutput>;

// The operation
/**
 * Delete an SSH key
 *
 * Deletes an SSH key. It cannot be used anymore.
 *
 * @param id - ID of the SSH Key.
 */
export const sshKeysIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: SshKeysIdDeleteInput,
	outputSchema: SshKeysIdDeleteOutput,
}));
