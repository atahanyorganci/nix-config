import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AccountsGetInput {}
export const AccountsGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/accounts" }),
) as unknown as Schema.Codec<AccountsGetInput>;

// Output Schema
export type AccountsGetOutput = ReadonlyArray<{
	id: string;
	settings: {
		peer_login_expiration_enabled: boolean;
		peer_login_expiration: number;
		peer_inactivity_expiration_enabled: boolean;
		peer_inactivity_expiration: number;
		regular_users_view_blocked: boolean;
		groups_propagation_enabled?: boolean;
		jwt_groups_enabled?: boolean;
		jwt_groups_claim_name?: string;
		jwt_allow_groups?: ReadonlyArray<string>;
		routing_peer_dns_resolution_enabled?: boolean;
		dns_domain?: string;
		network_range?: string;
		network_range_v6?: string;
		peer_expose_enabled: boolean;
		peer_expose_groups: ReadonlyArray<string>;
		extra?: {
			peer_approval_enabled: boolean;
			user_approval_required: boolean;
			network_traffic_logs_enabled: boolean;
			network_traffic_logs_groups: ReadonlyArray<string>;
			network_traffic_packet_counter_enabled: boolean;
		};
		lazy_connection_enabled?: boolean;
		auto_update_version?: string;
		auto_update_always?: boolean;
		metrics_push_enabled?: boolean;
		agent_network_only?: boolean;
		dashboard_features?: { agent_network?: boolean };
		embedded_idp_enabled?: boolean;
		local_auth_disabled?: boolean;
		local_mfa_enabled?: boolean;
		ipv6_enabled_groups?: ReadonlyArray<string>;
	};
	domain: string;
	domain_category: string;
	created_at: string;
	created_by: string;
	onboarding: { signup_form_pending: boolean; onboarding_flow_pending: boolean };
}>;
export const AccountsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		settings: Schema.Struct({
			peer_login_expiration_enabled: Schema.Boolean,
			peer_login_expiration: Schema.Number,
			peer_inactivity_expiration_enabled: Schema.Boolean,
			peer_inactivity_expiration: Schema.Number,
			regular_users_view_blocked: Schema.Boolean,
			groups_propagation_enabled: Schema.optional(Schema.Boolean),
			jwt_groups_enabled: Schema.optional(Schema.Boolean),
			jwt_groups_claim_name: Schema.optional(Schema.String),
			jwt_allow_groups: Schema.optional(Schema.Array(Schema.String)),
			routing_peer_dns_resolution_enabled: Schema.optional(Schema.Boolean),
			dns_domain: Schema.optional(Schema.String),
			network_range: Schema.optional(Schema.String),
			network_range_v6: Schema.optional(Schema.String),
			peer_expose_enabled: Schema.Boolean,
			peer_expose_groups: Schema.Array(Schema.String),
			extra: Schema.optional(
				Schema.Struct({
					peer_approval_enabled: Schema.Boolean,
					user_approval_required: Schema.Boolean,
					network_traffic_logs_enabled: Schema.Boolean,
					network_traffic_logs_groups: Schema.Array(Schema.String),
					network_traffic_packet_counter_enabled: Schema.Boolean,
				}),
			),
			lazy_connection_enabled: Schema.optional(Schema.Boolean),
			auto_update_version: Schema.optional(Schema.String),
			auto_update_always: Schema.optional(Schema.Boolean),
			metrics_push_enabled: Schema.optional(Schema.Boolean),
			agent_network_only: Schema.optional(Schema.Boolean),
			dashboard_features: Schema.optional(
				Schema.Struct({
					agent_network: Schema.optional(Schema.Boolean),
				}),
			),
			embedded_idp_enabled: Schema.optional(Schema.Boolean),
			local_auth_disabled: Schema.optional(Schema.Boolean),
			local_mfa_enabled: Schema.optional(Schema.Boolean),
			ipv6_enabled_groups: Schema.optional(Schema.Array(Schema.String)),
		}),
		domain: Schema.String,
		domain_category: Schema.String,
		created_at: Schema.String,
		created_by: Schema.String,
		onboarding: Schema.Struct({
			signup_form_pending: Schema.Boolean,
			onboarding_flow_pending: Schema.Boolean,
		}),
	}),
) as unknown as Schema.Codec<AccountsGetOutput>;

// The operation
/**
 * List all Accounts
 *
 * Returns a list of accounts of a user. Always returns a list of one account.
 */
export const accountsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AccountsGetInput,
	outputSchema: AccountsGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
