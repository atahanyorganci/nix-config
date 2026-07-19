import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ReverseProxiesServicesServiceIdDeleteInput {
	serviceId: string;
}
export const ReverseProxiesServicesServiceIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	serviceId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/reverse-proxies/services/{serviceId}" }),
) as unknown as Schema.Codec<ReverseProxiesServicesServiceIdDeleteInput>;

// Output Schema
export type ReverseProxiesServicesServiceIdDeleteOutput = void;
export const ReverseProxiesServicesServiceIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<ReverseProxiesServicesServiceIdDeleteOutput>;

// The operation
/**
 * Delete a Service
 *
 * Delete an existing service
 *
 * @param serviceId - The unique identifier of a service
 */
export const reverseProxiesServicesServiceIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: ReverseProxiesServicesServiceIdDeleteInput,
	outputSchema: ReverseProxiesServicesServiceIdDeleteOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
