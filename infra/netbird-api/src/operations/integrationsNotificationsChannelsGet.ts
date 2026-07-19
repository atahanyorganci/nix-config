import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsNotificationsChannelsGetInput {}
export const IntegrationsNotificationsChannelsGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/notifications/channels" }),
) as unknown as Schema.Codec<IntegrationsNotificationsChannelsGetInput>;

// Output Schema
export type IntegrationsNotificationsChannelsGetOutput = ReadonlyArray<{
	id: string;
	type: "email" | "webhook";
	target?: { emails: ReadonlyArray<string> } | { url: string; headers?: Record<string, string> };
	event_types: ReadonlyArray<string>;
	enabled: boolean;
}>;
export const IntegrationsNotificationsChannelsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<IntegrationsNotificationsChannelsGetOutput>;

// The operation
/**
 * List Notification Channels
 *
 * Retrieves all notification channels configured for the authenticated account.
 */
export const integrationsNotificationsChannelsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsNotificationsChannelsGetInput,
	outputSchema: IntegrationsNotificationsChannelsGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
