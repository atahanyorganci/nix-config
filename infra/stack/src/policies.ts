import { hostNetBirdGroup, type Inventory, type PolicySourceGroupName } from "./inventory.ts";
import type { AccessMatrixEntry } from "./access-matrix.ts";
import type { PolicyRule } from "@yorganci/netbird-alchemy";

export const policyNameForRule = (ruleName: string) => `allow-${ruleName}`;

export const allowPolicyLogicalId = (ruleName: string) =>
	`Allow${ruleName
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map(part => part[0]!.toUpperCase() + part.slice(1))
		.join("")}`;

export const adminAllowAllRules = (adminGroupId: string, allGroupId: string): ReadonlyArray<PolicyRule> => [
	{
		name: "admin-tcp",
		description: "Admins may reach all peers over TCP",
		enabled: true,
		action: "accept",
		bidirectional: false,
		protocol: "tcp",
		// TCP/22 is the dedicated admin-ssh rule. A catch-all that includes 22
		// makes NetBird treat SSH as wildcard access when peer SSH is enabled.
		portRanges: [
			{ start: 1, end: 21 },
			{ start: 23, end: 65535 },
		],
		sources: [adminGroupId],
		destinations: [allGroupId],
	},
	{
		name: "admin-udp",
		description: "Admins may reach all peers over UDP",
		enabled: true,
		action: "accept",
		bidirectional: false,
		protocol: "udp",
		sources: [adminGroupId],
		destinations: [allGroupId],
	},
	{
		name: "admin-icmp",
		description: "Admins may reach all peers over ICMP",
		enabled: true,
		action: "accept",
		bidirectional: false,
		protocol: "icmp",
		sources: [adminGroupId],
		destinations: [allGroupId],
	},
];

export const adminSshRules = (adminGroupId: string, allGroupId: string): ReadonlyArray<PolicyRule> => [
	{
		name: "admin-ssh",
		description: "Admins may SSH to all hosts over OpenSSH",
		enabled: true,
		action: "accept",
		bidirectional: false,
		protocol: "tcp",
		ports: ["22"],
		sources: [adminGroupId],
		destinations: [allGroupId],
	},
];

export const serverSshRules = (serversGroupId: string, agentsGroupId: string): ReadonlyArray<PolicyRule> => [
	{
		name: "servers-ssh",
		description: "Servers may SSH to servers and agents over OpenSSH",
		enabled: true,
		action: "accept",
		bidirectional: false,
		protocol: "tcp",
		ports: ["22"],
		sources: [serversGroupId],
		destinations: [serversGroupId, agentsGroupId],
	},
];

/** One rule per matrix entry; the protocol suffix keeps DNS UDP and TCP entries distinct. */
const ruleName = (entry: AccessMatrixEntry) => `${entry.host}-${entry.service}-${entry.protocol}`;

export const allowRulesFromMatrix = (
	matrix: ReadonlyArray<AccessMatrixEntry>,
	inventory: Inventory,
	resolveGroupId: (name: PolicySourceGroupName) => string,
): ReadonlyArray<PolicyRule> => {
	const rules: Array<PolicyRule> = [];

	for (const entry of matrix) {
		const destinationGroup = hostNetBirdGroup(inventory, entry.host);
		if (!destinationGroup) {
			continue;
		}

		const rule: PolicyRule = {
			name: ruleName(entry),
			description: `${entry.allowedSourceGroups.join(",")} -> ${entry.host}:${entry.port}/${entry.protocol}`,
			enabled: true,
			action: "accept",
			bidirectional: false,
			protocol: entry.protocol,
			sources: entry.allowedSourceGroups.map(resolveGroupId),
			destinations: [resolveGroupId(destinationGroup)],
		};

		if (entry.protocol === "tcp" || entry.protocol === "udp") {
			rule.ports = [String(entry.port)];
		}

		rules.push(rule);
	}

	return rules;
};
