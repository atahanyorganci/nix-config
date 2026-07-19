import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface EventStreamingPostInput {
	platform: "datadog" | "s3" | "firehose" | "generic_http";
	config: Record<string, string>;
	enabled: boolean;
}
export const EventStreamingPostInput = /*@__PURE__*/ Schema.Struct({
	platform: Schema.Literals(["datadog", "s3", "firehose", "generic_http"]),
	config: Schema.Record(Schema.String, Schema.String),
	enabled: Schema.Boolean,
}).pipe(T.Http({ method: "POST", path: "/api/event-streaming" })) as unknown as Schema.Codec<EventStreamingPostInput>;

// Output Schema
export interface EventStreamingPostOutput {
	id?: number;
	account_id?: string;
	enabled?: boolean;
	platform?: "datadog" | "s3" | "firehose" | "generic_http";
	created_at?: string;
	updated_at?: string;
	config?: Record<string, string>;
}
export const EventStreamingPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.optional(Schema.Number),
	account_id: Schema.optional(Schema.String),
	enabled: Schema.optional(Schema.Boolean),
	platform: Schema.optional(Schema.Literals(["datadog", "s3", "firehose", "generic_http"])),
	created_at: Schema.optional(Schema.String),
	updated_at: Schema.optional(Schema.String),
	config: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}) as unknown as Schema.Codec<EventStreamingPostOutput>;

// The operation
/**
 * Create Event Streaming Integration
 *
 * Creates a new event streaming integration for the authenticated account.
 * The request body should conform to `CreateIntegrationRequest`.
 * Note: Based on the provided Go code, the `enabled` field from the request is part of the `CreateIntegrationRequest` struct,
 * but the backend `manager.CreateIntegration` function signature shown does not directly use this `enabled` field.
 * The actual behavior for `enabled` during creation should be confirmed (e.g., it might have a server-side default or be handled by other logic).
 */
export const eventStreamingPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: EventStreamingPostInput,
	outputSchema: EventStreamingPostOutput,
	errors: [BadRequest] as const,
}));
