import {
	type AccountExtraSettings,
	type AccountSettings as ApiAccountSettings,
	type AccountSettingsInput,
	accountsAccountIdPut,
	accountsGet,
} from "@yorganci/netbird-api/accounts";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";

export interface AccountSettingsProps {
	/**
	 * Users joining through an external identity provider wait, blocked, for
	 * an admin to approve them. Off, they join at once, with no groups.
	 * Omitted leaves the current value (NetBird's default for a new account:
	 * `true`).
	 */
	userApprovalRequired?: boolean;
	/**
	 * A change to a user's auto groups also reaches the peers that user
	 * already registered. Omitted leaves the current value (NetBird's default
	 * for a new account: `true`).
	 */
	groupsPropagationEnabled?: boolean;
}

export interface AccountSettingsAttributes {
	/** The account's id; a self-hosted server has one account. */
	accountId: string;
	userApprovalRequired: boolean;
	groupsPropagationEnabled: boolean;
	/**
	 * Whether local (email and password) users are off, which the server's
	 * configuration decides; read-only.
	 */
	localAuthDisabled: boolean;
}

export type AccountSettings = Resource<"NetBird.AccountSettings", AccountSettingsProps, AccountSettingsAttributes>;

/**
 * Settings of the account the credentials belong to: the parts of
 * `PUT /api/accounts/{id}` a stack declares. Every other setting is kept as
 * it is, since NetBird replaces them all on update.
 *
 * There is one account, so there is nothing to create or delete: the first
 * deploy adopts it, and removing the resource leaves the settings as they
 * are.
 *
 * @resource
 * @product Accounts
 * @category NetBird
 * @section Account Settings
 * @example New users join without approval
 * ```typescript
 * yield* NetBird.AccountSettings("Account", {
 *   userApprovalRequired: false,
 *   groupsPropagationEnabled: true,
 * });
 * ```
 */
export const AccountSettings = Resource<AccountSettings>("NetBird.AccountSettings");

export const isAccountSettings = (value: unknown): value is AccountSettings =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.AccountSettings";

type ApiAccount = { id: string; settings: ApiAccountSettings };

/** What NetBird reports when an account carries no extra settings. */
const DEFAULT_EXTRA: AccountExtraSettings = {
	peer_approval_enabled: false,
	user_approval_required: true,
	network_traffic_logs_enabled: false,
	network_traffic_logs_groups: [],
	network_traffic_packet_counter_enabled: false,
};

const userApprovalRequired = (settings: ApiAccountSettings) => (settings.extra ?? DEFAULT_EXTRA).user_approval_required;

const groupsPropagationEnabled = (settings: ApiAccountSettings) => settings.groups_propagation_enabled ?? false;

/** The values the props ask for, the observed ones where they are left out. */
export const desiredSettings = (props: AccountSettingsProps, observed: ApiAccountSettings) => ({
	userApprovalRequired: props.userApprovalRequired ?? userApprovalRequired(observed),
	groupsPropagationEnabled: props.groupsPropagationEnabled ?? groupsPropagationEnabled(observed),
});

/**
 * The full update body: every writable setting as observed, with the
 * declared ones changed. Read-only fields (`embedded_idp_enabled`,
 * `local_auth_disabled`) are left out.
 */
export const settingsInput = (
	observed: ApiAccountSettings,
	desired: ReturnType<typeof desiredSettings>,
): AccountSettingsInput => {
	const {
		embedded_idp_enabled: _embeddedIdpEnabled,
		local_auth_disabled: _localAuthDisabled,
		extra = DEFAULT_EXTRA,
		...writable
	} = observed;
	return {
		...writable,
		groups_propagation_enabled: desired.groupsPropagationEnabled,
		extra: {
			peer_approval_enabled: extra.peer_approval_enabled,
			user_approval_required: desired.userApprovalRequired,
			network_traffic_logs_enabled: extra.network_traffic_logs_enabled,
			network_traffic_logs_groups: extra.network_traffic_logs_groups,
			network_traffic_packet_counter_enabled: extra.network_traffic_packet_counter_enabled,
		},
	};
};

export const AccountSettingsProvider = () =>
	Provider.succeed(AccountSettings, {
		stables: ["accountId"],
		// One account per server: there is nothing to tear down.
		nuke: { singleton: true },
		read: Effect.fn(function* () {
			const account = yield* readAccount;
			return account ? toAttributes(account) : undefined;
		}),
		list: Effect.fn(function* () {
			const account = yield* readAccount;
			return account ? [toAttributes(account)] : [];
		}),
		reconcile: Effect.fn(function* ({ news }) {
			const props = news ?? ({} as AccountSettingsProps);
			const account = yield* readAccount;
			if (!account) {
				return yield* Effect.die(new Error("NetBird.AccountSettings: the credentials see no account"));
			}
			const desired = desiredSettings(props, account.settings);
			if (
				desired.userApprovalRequired === userApprovalRequired(account.settings) &&
				desired.groupsPropagationEnabled === groupsPropagationEnabled(account.settings)
			) {
				return toAttributes(account);
			}
			const updated = yield* accountsAccountIdPut({
				accountId: account.id,
				settings: settingsInput(account.settings, desired),
			});
			return toAttributes(updated);
		}),
		// The settings outlive the resource.
		delete: () => Effect.void,
	});

const readAccount = accountsGet({}).pipe(Effect.map((accounts): ApiAccount | undefined => accounts[0]));

const toAttributes = (account: ApiAccount): AccountSettingsAttributes => ({
	accountId: account.id,
	userApprovalRequired: userApprovalRequired(account.settings),
	groupsPropagationEnabled: groupsPropagationEnabled(account.settings),
	localAuthDisabled: account.settings.local_auth_disabled ?? false,
});
