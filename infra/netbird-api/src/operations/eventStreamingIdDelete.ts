import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface EventStreamingIdDeleteInput {
	id: number;
}
export const EventStreamingIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/event-streaming/{id}" }),
) as unknown as Schema.Codec<EventStreamingIdDeleteInput>;

// Output Schema
export type EventStreamingIdDeleteOutput = unknown;
export const EventStreamingIdDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<EventStreamingIdDeleteOutput>;

// The operation
/**
 * Delete Event Streaming Integration
 *
 * Deletes an event streaming integration by its ID.
 *
 * @param id - The unique numeric identifier of the event streaming integration.
 */
export const eventStreamingIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: EventStreamingIdDeleteInput,
	outputSchema: EventStreamingIdDeleteOutput,
	errors: [BadRequest, NotFound] as const,
}));
