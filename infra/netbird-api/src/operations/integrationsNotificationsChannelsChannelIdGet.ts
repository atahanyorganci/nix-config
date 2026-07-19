import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsNotificationsChannelsChannelIdGetInput {
	channelId: string;
}
export const IntegrationsNotificationsChannelsChannelIdGetInput = /*@__PURE__*/ Schema.Struct({
	channelId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/notifications/channels/{channelId}" }),
) as unknown as Schema.Codec<IntegrationsNotificationsChannelsChannelIdGetInput>;

// Output Schema
export interface IntegrationsNotificationsChannelsChannelIdGetOutput {
	id: string;
	type: "email" | "webhook";
	target?: { emails: ReadonlyArray<string> } | { url: string; headers?: Record<string, string> };
	event_types: ReadonlyArray<string>;
	enabled: boolean;
}
export const IntegrationsNotificationsChannelsChannelIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<IntegrationsNotificationsChannelsChannelIdGetOutput>;

// The operation
/**
 * Get Notification Channel
 *
 * Retrieves a specific notification channel by its ID.
 *
 * @param channelId - The unique identifier of the notification channel.
 */
export const integrationsNotificationsChannelsChannelIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsNotificationsChannelsChannelIdGetInput,
	outputSchema: IntegrationsNotificationsChannelsChannelIdGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
