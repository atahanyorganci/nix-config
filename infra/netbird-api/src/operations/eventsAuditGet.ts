import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface EventsAuditGetInput {}
export const EventsAuditGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/events/audit" }),
) as unknown as Schema.Codec<EventsAuditGetInput>;

// Output Schema
export type EventsAuditGetOutput = ReadonlyArray<{
	id: string;
	timestamp: string;
	activity: string;
	activity_code:
		| "peer.user.add"
		| "peer.setupkey.add"
		| "user.join"
		| "user.invite"
		| "account.create"
		| "account.delete"
		| "user.peer.delete"
		| "rule.add"
		| "rule.update"
		| "rule.delete"
		| "policy.add"
		| "policy.update"
		| "policy.delete"
		| "setupkey.add"
		| "setupkey.update"
		| "setupkey.revoke"
		| "setupkey.overuse"
		| "setupkey.delete"
		| "group.add"
		| "group.update"
		| "group.delete"
		| "peer.group.add"
		| "peer.group.delete"
		| "user.group.add"
		| "user.group.delete"
		| "user.role.update"
		| "setupkey.group.add"
		| "setupkey.group.delete"
		| "dns.setting.disabled.management.group.add"
		| "dns.setting.disabled.management.group.delete"
		| "route.add"
		| "route.delete"
		| "route.update"
		| "peer.ssh.enable"
		| "peer.ssh.disable"
		| "peer.rename"
		| "peer.login.expiration.enable"
		| "peer.login.expiration.disable"
		| "nameserver.group.add"
		| "nameserver.group.delete"
		| "nameserver.group.update"
		| "account.setting.peer.login.expiration.update"
		| "account.setting.peer.login.expiration.enable"
		| "account.setting.peer.login.expiration.disable"
		| "personal.access.token.create"
		| "personal.access.token.delete"
		| "service.user.create"
		| "service.user.delete"
		| "user.block"
		| "user.unblock"
		| "user.delete"
		| "user.peer.login"
		| "peer.login.expire"
		| "dashboard.login"
		| "integration.create"
		| "integration.update"
		| "integration.delete"
		| "account.setting.peer.approval.enable"
		| "account.setting.peer.approval.disable"
		| "peer.approve"
		| "peer.approval.revoke"
		| "transferred.owner.role"
		| "posture.check.create"
		| "posture.check.update"
		| "posture.check.delete"
		| "peer.inactivity.expiration.enable"
		| "peer.inactivity.expiration.disable"
		| "account.peer.inactivity.expiration.enable"
		| "account.peer.inactivity.expiration.disable"
		| "account.peer.inactivity.expiration.update"
		| "account.setting.group.propagation.enable"
		| "account.setting.group.propagation.disable"
		| "account.setting.routing.peer.dns.resolution.enable"
		| "account.setting.routing.peer.dns.resolution.disable"
		| "network.create"
		| "network.update"
		| "network.delete"
		| "network.resource.create"
		| "network.resource.update"
		| "network.resource.delete"
		| "network.router.create"
		| "network.router.update"
		| "network.router.delete"
		| "resource.group.add"
		| "resource.group.delete"
		| "account.dns.domain.update"
		| "account.setting.lazy.connection.enable"
		| "account.setting.lazy.connection.disable"
		| "account.network.range.update"
		| "peer.ip.update"
		| "user.approve"
		| "user.reject"
		| "user.create"
		| "account.settings.auto.version.update"
		| "identityprovider.create"
		| "identityprovider.update"
		| "identityprovider.delete"
		| "dns.zone.create"
		| "dns.zone.update"
		| "dns.zone.delete"
		| "dns.zone.record.create"
		| "dns.zone.record.update"
		| "dns.zone.record.delete"
		| "peer.job.create"
		| "user.password.change"
		| "user.invite.link.create"
		| "user.invite.link.accept"
		| "user.invite.link.regenerate"
		| "user.invite.link.delete"
		| "service.create"
		| "service.update"
		| "service.delete";
	initiator_id: string;
	initiator_name: string;
	initiator_email: string;
	target_id: string;
	meta: Record<string, string>;
}>;
export const EventsAuditGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		timestamp: Schema.String,
		activity: Schema.String,
		activity_code: Schema.Literals([
			"peer.user.add",
			"peer.setupkey.add",
			"user.join",
			"user.invite",
			"account.create",
			"account.delete",
			"user.peer.delete",
			"rule.add",
			"rule.update",
			"rule.delete",
			"policy.add",
			"policy.update",
			"policy.delete",
			"setupkey.add",
			"setupkey.update",
			"setupkey.revoke",
			"setupkey.overuse",
			"setupkey.delete",
			"group.add",
			"group.update",
			"group.delete",
			"peer.group.add",
			"peer.group.delete",
			"user.group.add",
			"user.group.delete",
			"user.role.update",
			"setupkey.group.add",
			"setupkey.group.delete",
			"dns.setting.disabled.management.group.add",
			"dns.setting.disabled.management.group.delete",
			"route.add",
			"route.delete",
			"route.update",
			"peer.ssh.enable",
			"peer.ssh.disable",
			"peer.rename",
			"peer.login.expiration.enable",
			"peer.login.expiration.disable",
			"nameserver.group.add",
			"nameserver.group.delete",
			"nameserver.group.update",
			"account.setting.peer.login.expiration.update",
			"account.setting.peer.login.expiration.enable",
			"account.setting.peer.login.expiration.disable",
			"personal.access.token.create",
			"personal.access.token.delete",
			"service.user.create",
			"service.user.delete",
			"user.block",
			"user.unblock",
			"user.delete",
			"user.peer.login",
			"peer.login.expire",
			"dashboard.login",
			"integration.create",
			"integration.update",
			"integration.delete",
			"account.setting.peer.approval.enable",
			"account.setting.peer.approval.disable",
			"peer.approve",
			"peer.approval.revoke",
			"transferred.owner.role",
			"posture.check.create",
			"posture.check.update",
			"posture.check.delete",
			"peer.inactivity.expiration.enable",
			"peer.inactivity.expiration.disable",
			"account.peer.inactivity.expiration.enable",
			"account.peer.inactivity.expiration.disable",
			"account.peer.inactivity.expiration.update",
			"account.setting.group.propagation.enable",
			"account.setting.group.propagation.disable",
			"account.setting.routing.peer.dns.resolution.enable",
			"account.setting.routing.peer.dns.resolution.disable",
			"network.create",
			"network.update",
			"network.delete",
			"network.resource.create",
			"network.resource.update",
			"network.resource.delete",
			"network.router.create",
			"network.router.update",
			"network.router.delete",
			"resource.group.add",
			"resource.group.delete",
			"account.dns.domain.update",
			"account.setting.lazy.connection.enable",
			"account.setting.lazy.connection.disable",
			"account.network.range.update",
			"peer.ip.update",
			"user.approve",
			"user.reject",
			"user.create",
			"account.settings.auto.version.update",
			"identityprovider.create",
			"identityprovider.update",
			"identityprovider.delete",
			"dns.zone.create",
			"dns.zone.update",
			"dns.zone.delete",
			"dns.zone.record.create",
			"dns.zone.record.update",
			"dns.zone.record.delete",
			"peer.job.create",
			"user.password.change",
			"user.invite.link.create",
			"user.invite.link.accept",
			"user.invite.link.regenerate",
			"user.invite.link.delete",
			"service.create",
			"service.update",
			"service.delete",
		]),
		initiator_id: Schema.String,
		initiator_name: Schema.String,
		initiator_email: Schema.String,
		target_id: Schema.String,
		meta: Schema.Record(Schema.String, Schema.String),
	}),
) as unknown as Schema.Codec<EventsAuditGetOutput>;

// The operation
/**
 * List all Audit Events
 *
 * Returns a list of all audit events
 */
export const eventsAuditGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: EventsAuditGetInput,
	outputSchema: EventsAuditGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
