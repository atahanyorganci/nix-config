import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface EventStreamingIdPutInput {
	id: number;
	platform: "datadog" | "s3" | "firehose" | "generic_http";
	config: Record<string, string>;
	enabled: boolean;
}
export const EventStreamingIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	platform: Schema.Literals(["datadog", "s3", "firehose", "generic_http"]),
	config: Schema.Record(Schema.String, Schema.String),
	enabled: Schema.Boolean,
}).pipe(
	T.Http({ method: "PUT", path: "/api/event-streaming/{id}" }),
) as unknown as Schema.Codec<EventStreamingIdPutInput>;

// Output Schema
export interface EventStreamingIdPutOutput {
	id?: number;
	account_id?: string;
	enabled?: boolean;
	platform?: "datadog" | "s3" | "firehose" | "generic_http";
	created_at?: string;
	updated_at?: string;
	config?: Record<string, string>;
}
export const EventStreamingIdPutOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.optional(Schema.Number),
	account_id: Schema.optional(Schema.String),
	enabled: Schema.optional(Schema.Boolean),
	platform: Schema.optional(Schema.Literals(["datadog", "s3", "firehose", "generic_http"])),
	created_at: Schema.optional(Schema.String),
	updated_at: Schema.optional(Schema.String),
	config: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}) as unknown as Schema.Codec<EventStreamingIdPutOutput>;

// The operation
/**
 * Update Event Streaming Integration
 *
 * Updates an existing event streaming integration. The request body structure is `CreateIntegrationRequest`.
 * However, for updates:
 * - The `platform` field, if provided in the body, is ignored by the backend manager function, as the platform of an existing integration is typically immutable.
 * - The `enabled` and `config` fields from the request body are used to update the integration.
 *
 * @param id - The unique numeric identifier of the event streaming integration.
 */
export const eventStreamingIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: EventStreamingIdPutInput,
	outputSchema: EventStreamingIdPutOutput,
	errors: [BadRequest, NotFound] as const,
}));
