import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsNotificationsChannelsChannelIdDeleteInput {
	channelId: string;
}
export const IntegrationsNotificationsChannelsChannelIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	channelId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/integrations/notifications/channels/{channelId}" }),
) as unknown as Schema.Codec<IntegrationsNotificationsChannelsChannelIdDeleteInput>;

// Output Schema
export type IntegrationsNotificationsChannelsChannelIdDeleteOutput = unknown;
export const IntegrationsNotificationsChannelsChannelIdDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<IntegrationsNotificationsChannelsChannelIdDeleteOutput>;

// The operation
/**
 * Delete Notification Channel
 *
 * Deletes a notification channel by its ID.
 *
 * @param channelId - The unique identifier of the notification channel.
 */
export const integrationsNotificationsChannelsChannelIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsNotificationsChannelsChannelIdDeleteInput,
	outputSchema: IntegrationsNotificationsChannelsChannelIdDeleteOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
