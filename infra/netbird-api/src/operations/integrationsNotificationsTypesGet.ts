import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsNotificationsTypesGetInput {}
export const IntegrationsNotificationsTypesGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/notifications/types" }),
) as unknown as Schema.Codec<IntegrationsNotificationsTypesGetInput>;

// Output Schema
export type IntegrationsNotificationsTypesGetOutput = Record<string, string>;
export const IntegrationsNotificationsTypesGetOutput = /*@__PURE__*/ Schema.Record(
	Schema.String,
	Schema.String,
) as unknown as Schema.Codec<IntegrationsNotificationsTypesGetOutput>;

// The operation
/**
 * List Notification Event Types
 *
 * Returns a map of all supported activity event type codes to their
 * human-readable descriptions. Use these codes when configuring
 * `event_types` on notification channels.
 */
export const integrationsNotificationsTypesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsNotificationsTypesGetInput,
	outputSchema: IntegrationsNotificationsTypesGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
