import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsNotificationsChannelsChannelIdPutInput {
	channelId: string;
	type: "email" | "webhook";
	target?: { emails: ReadonlyArray<string> } | { url: string; headers?: Record<string, string> };
	event_types: ReadonlyArray<string>;
	enabled: boolean;
}
export const IntegrationsNotificationsChannelsChannelIdPutInput = /*@__PURE__*/ Schema.Struct({
	channelId: Schema.String.pipe(T.PathParam()),
	type: Schema.Literals(["email", "webhook"]),
	target: Schema.optional(
		Schema.Union([
			Schema.Struct({
				emails: Schema.Array(Schema.String),
			}),
			Schema.Struct({
				url: Schema.String,
				headers: Schema.optional(Schema.Record(Schema.String, Schema.String)),
			}),
		]),
	),
	event_types: Schema.Array(Schema.String),
	enabled: Schema.Boolean,
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/notifications/channels/{channelId}" }),
) as unknown as Schema.Codec<IntegrationsNotificationsChannelsChannelIdPutInput>;

// Output Schema
export interface IntegrationsNotificationsChannelsChannelIdPutOutput {
	id: string;
	type: "email" | "webhook";
	target?: { emails: ReadonlyArray<string> } | { url: string; headers?: Record<string, string> };
	event_types: ReadonlyArray<string>;
	enabled: boolean;
}
export const IntegrationsNotificationsChannelsChannelIdPutOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	type: Schema.Literals(["email", "webhook"]),
	target: Schema.optional(
		Schema.Union([
			Schema.Struct({
				emails: Schema.Array(Schema.String),
			}),
			Schema.Struct({
				url: Schema.String,
				headers: Schema.optional(Schema.Record(Schema.String, Schema.String)),
			}),
		]),
	),
	event_types: Schema.Array(Schema.String),
	enabled: Schema.Boolean,
}) as unknown as Schema.Codec<IntegrationsNotificationsChannelsChannelIdPutOutput>;

// The operation
/**
 * Update Notification Channel
 *
 * Updates an existing notification channel.
 *
 * @param channelId - The unique identifier of the notification channel.
 */
export const integrationsNotificationsChannelsChannelIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsNotificationsChannelsChannelIdPutInput,
	outputSchema: IntegrationsNotificationsChannelsChannelIdPutOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
