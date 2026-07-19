import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface EventStreamingGetInput {}
export const EventStreamingGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/event-streaming" }),
) as unknown as Schema.Codec<EventStreamingGetInput>;

// Output Schema
export type EventStreamingGetOutput = ReadonlyArray<{
	id?: number;
	account_id?: string;
	enabled?: boolean;
	platform?: "datadog" | "s3" | "firehose" | "generic_http";
	created_at?: string;
	updated_at?: string;
	config?: Record<string, string>;
}>;
export const EventStreamingGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.optional(Schema.Number),
		account_id: Schema.optional(Schema.String),
		enabled: Schema.optional(Schema.Boolean),
		platform: Schema.optional(Schema.Literals(["datadog", "s3", "firehose", "generic_http"])),
		created_at: Schema.optional(Schema.String),
		updated_at: Schema.optional(Schema.String),
		config: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	}),
) as unknown as Schema.Codec<EventStreamingGetOutput>;

// The operation
/**
 * List Event Streaming Integrations
 *
 * Retrieves all event streaming integrations for the authenticated account.
 */
export const eventStreamingGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: EventStreamingGetInput,
	outputSchema: EventStreamingGetOutput,
}));
