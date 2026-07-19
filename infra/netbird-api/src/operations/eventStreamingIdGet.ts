import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface EventStreamingIdGetInput {
	id: number;
}
export const EventStreamingIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/event-streaming/{id}" }),
) as unknown as Schema.Codec<EventStreamingIdGetInput>;

// Output Schema
export interface EventStreamingIdGetOutput {
	id?: number;
	account_id?: string;
	enabled?: boolean;
	platform?: "datadog" | "s3" | "firehose" | "generic_http";
	created_at?: string;
	updated_at?: string;
	config?: Record<string, string>;
}
export const EventStreamingIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.optional(Schema.Number),
	account_id: Schema.optional(Schema.String),
	enabled: Schema.optional(Schema.Boolean),
	platform: Schema.optional(Schema.Literals(["datadog", "s3", "firehose", "generic_http"])),
	created_at: Schema.optional(Schema.String),
	updated_at: Schema.optional(Schema.String),
	config: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}) as unknown as Schema.Codec<EventStreamingIdGetOutput>;

// The operation
/**
 * Get Event Streaming Integration
 *
 * Retrieves a specific event streaming integration by its ID.
 *
 * @param id - The unique numeric identifier of the event streaming integration.
 */
export const eventStreamingIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: EventStreamingIdGetInput,
	outputSchema: EventStreamingIdGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
