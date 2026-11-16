import { describe, expect, it } from "vitest";
import { desiredSettings, isUpToDate, settingsInput } from "../src/AccountSettings/AccountSettings.ts";
import type { AccountSettings } from "@yorganci/netbird-api/accounts";

const observed: AccountSettings = {
	peer_login_expiration_enabled: true,
	peer_login_expiration: 86_400,
	peer_inactivity_expiration_enabled: false,
	peer_inactivity_expiration: 600,
	regular_users_view_blocked: true,
	groups_propagation_enabled: true,
	jwt_groups_enabled: false,
	jwt_allow_groups: ["Admin"],
	routing_peer_dns_resolution_enabled: true,
	dns_domain: "netbird.selfhosted",
	peer_expose_enabled: false,
	peer_expose_groups: [],
	extra: {
		peer_approval_enabled: false,
		user_approval_required: true,
		network_traffic_logs_enabled: false,
		network_traffic_logs_groups: [],
		network_traffic_packet_counter_enabled: false,
	},
	lazy_connection_enabled: false,
	embedded_idp_enabled: true,
	local_auth_disabled: true,
	local_mfa_enabled: false,
};

const observedDesired = {
	userApprovalRequired: true,
	groupsPropagationEnabled: true,
	jwtGroupsEnabled: false,
	jwtGroupsClaimName: "",
	jwtAllowGroups: ["Admin"],
};

describe("desiredSettings", () => {
	it("keeps what the props leave out", () => {
		expect(desiredSettings({}, observed)).toEqual(observedDesired);
	});

	it("takes what the props declare", () => {
		expect(
			desiredSettings({ userApprovalRequired: false, jwtGroupsEnabled: true, jwtGroupsClaimName: "groups" }, observed),
		).toEqual({
			...observedDesired,
			userApprovalRequired: false,
			jwtGroupsEnabled: true,
			jwtGroupsClaimName: "groups",
		});
	});
});

describe("isUpToDate", () => {
	it("holds for the observed values", () => {
		expect(isUpToDate(desiredSettings({}, observed), observed)).toBe(true);
	});

	it("compares allowed groups as a set", () => {
		const both = { ...observed, jwt_allow_groups: ["Admin", "User"] };
		expect(isUpToDate(desiredSettings({ jwtAllowGroups: ["User", "Admin", "User"] }, both), both)).toBe(true);
		expect(isUpToDate(desiredSettings({ jwtAllowGroups: ["User"] }, both), both)).toBe(false);
	});

	it("notices a JWT setting that differs", () => {
		expect(isUpToDate(desiredSettings({ jwtGroupsClaimName: "groups" }, observed), observed)).toBe(false);
	});
});

describe("settingsInput", () => {
	const input = settingsInput(observed, {
		...observedDesired,
		userApprovalRequired: false,
		jwtGroupsEnabled: true,
		jwtGroupsClaimName: "groups",
	});

	it("changes only the declared settings", () => {
		expect(input.extra).toEqual({ ...observed.extra, user_approval_required: false });
		expect(input.groups_propagation_enabled).toBe(true);
		expect(input.dns_domain).toEqual("netbird.selfhosted");
		expect(input.peer_login_expiration).toEqual(86_400);
		expect(input.regular_users_view_blocked).toBe(true);
		expect(input.jwt_groups_enabled).toBe(true);
		expect(input.jwt_groups_claim_name).toEqual("groups");
		expect(input.jwt_allow_groups).toEqual(["Admin"]);
	});

	it("leaves out the read-only fields", () => {
		expect(input).not.toHaveProperty("embedded_idp_enabled");
		expect(input).not.toHaveProperty("local_auth_disabled");
	});

	it("fills in extra settings an account lacks", () => {
		const { extra: _extra, ...bare } = observed;
		expect(
			settingsInput(bare, { ...observedDesired, userApprovalRequired: false, groupsPropagationEnabled: false }).extra,
		).toEqual({
			peer_approval_enabled: false,
			user_approval_required: false,
			network_traffic_logs_enabled: false,
			network_traffic_logs_groups: [],
			network_traffic_packet_counter_enabled: false,
		});
	});
});
