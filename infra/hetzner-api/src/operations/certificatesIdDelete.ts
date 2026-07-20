import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface CertificatesIdDeleteInput {
	id: number;
}
export const CertificatesIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/certificates/{id}" })) as unknown as Schema.Codec<CertificatesIdDeleteInput>;

// Output Schema
export type CertificatesIdDeleteOutput = void;
export const CertificatesIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<CertificatesIdDeleteOutput>;

// The operation
/**
 * Delete a Certificate
 *
 * Deletes a Certificate.
 *
 * @param id - ID of the Certificate.
 */
export const certificatesIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: CertificatesIdDeleteInput,
	outputSchema: CertificatesIdDeleteOutput,
}));
