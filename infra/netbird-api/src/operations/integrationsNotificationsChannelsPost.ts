import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsNotificationsChannelsPostInput {
	type: "email" | "webhook";
	target?: { emails: ReadonlyArray<string> } | { url: string; headers?: Record<string, string> };
	event_types: ReadonlyArray<string>;
	enabled: boolean;
}
export const IntegrationsNotificationsChannelsPostInput = /*@__PURE__*/ Schema.Struct({
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
	T.Http({ method: "POST", path: "/api/integrations/notifications/channels" }),
) as unknown as Schema.Codec<IntegrationsNotificationsChannelsPostInput>;

// Output Schema
export interface IntegrationsNotificationsChannelsPostOutput {
	id: string;
	type: "email" | "webhook";
	target?: { emails: ReadonlyArray<string> } | { url: string; headers?: Record<string, string> };
	event_types: ReadonlyArray<string>;
	enabled: boolean;
}
export const IntegrationsNotificationsChannelsPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<IntegrationsNotificationsChannelsPostOutput>;

// The operation
/**
 * Create Notification Channel
 *
 * Creates a new notification channel for the authenticated account.
 * Supported channel types are `email` and `webhook`.
 */
export const integrationsNotificationsChannelsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsNotificationsChannelsPostInput,
	outputSchema: IntegrationsNotificationsChannelsPostOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
