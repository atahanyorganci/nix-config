import { hostNetBirdGroup, type Inventory } from "./inventory.ts";
import type { AccessMatrixEntry } from "./access-matrix.ts";
import type { PolicyRule } from "@yorganci/netbird-alchemy";

export const ALL_GROUP_NAME = "All";

export const policyNameForRule = (ruleName: string) => `allow-${ruleName}`;

export const allowPolicyLogicalId = (ruleName: string) =>
	`Allow${ruleName
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map(part => part[0]!.toUpperCase() + part.slice(1))
		.join("")}`;

/** Plan-time rule with group names; IDs are bound via `bindPolicyRule` inside `Output.map`. */
export type PolicyRuleSpec = Omit<PolicyRule, "sources" | "destinations"> & {
	sourceGroups: ReadonlyArray<string>;
	destinationGroups: ReadonlyArray<string>;
};

export const adminAllowAllRules = (): ReadonlyArray<PolicyRuleSpec> => [
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
		sourceGroups: ["Admin"],
		destinationGroups: [ALL_GROUP_NAME],
	},
	{
		name: "admin-udp",
		description: "Admins may reach all peers over UDP",
		enabled: true,
		action: "accept",
		bidirectional: false,
		protocol: "udp",
		sourceGroups: ["Admin"],
		destinationGroups: [ALL_GROUP_NAME],
	},
	{
		name: "admin-icmp",
		description: "Admins may reach all peers over ICMP",
		enabled: true,
		action: "accept",
		bidirectional: false,
		protocol: "icmp",
		sourceGroups: ["Admin"],
		destinationGroups: [ALL_GROUP_NAME],
	},
];

export const adminSshRules = (): ReadonlyArray<PolicyRuleSpec> => [
	{
		name: "admin-ssh",
		description: "Admins may SSH to all hosts over OpenSSH",
		enabled: true,
		action: "accept",
		bidirectional: false,
		protocol: "tcp",
		ports: ["22"],
		sourceGroups: ["Admin"],
		destinationGroups: [ALL_GROUP_NAME],
	},
];

export const serverSshRules = (): ReadonlyArray<PolicyRuleSpec> => [
	{
		name: "servers-ssh",
		description: "Servers may SSH to servers and agents over OpenSSH",
		enabled: true,
		action: "accept",
		bidirectional: false,
		protocol: "tcp",
		ports: ["22"],
		sourceGroups: ["Servers"],
		destinationGroups: ["Servers", "Agents"],
	},
];

/** One rule per matrix entry; the protocol suffix keeps DNS UDP and TCP entries distinct. */
const ruleName = (entry: AccessMatrixEntry) => `${entry.host}-${entry.service}-${entry.protocol}`;

export const allowRulesFromMatrix = (
	matrix: ReadonlyArray<AccessMatrixEntry>,
	inventory: Inventory,
): ReadonlyArray<PolicyRuleSpec> => {
	const rules: Array<PolicyRuleSpec> = [];

	for (const entry of matrix) {
		const destinationGroup = hostNetBirdGroup(inventory, entry.host);
		if (!destinationGroup) {
			continue;
		}

		const rule: PolicyRuleSpec = {
			name: ruleName(entry),
			description: `${entry.allowedSourceGroups.join(",")} -> ${entry.host}:${entry.port}/${entry.protocol}`,
			enabled: true,
			action: "accept",
			bidirectional: false,
			protocol: entry.protocol,
			sourceGroups: [...entry.allowedSourceGroups],
			destinationGroups: [destinationGroup],
		};

		if (entry.protocol === "tcp" || entry.protocol === "udp") {
			rule.ports = [String(entry.port)];
		}

		rules.push(rule);
	}

	return rules;
};

export const bindPolicyRule = (spec: PolicyRuleSpec, groupIds: Record<string, string>): PolicyRule => {
	const lookup = (groupName: string) => {
		const id = groupIds[groupName];
		if (!id) {
			throw new Error(`NetBird group "${groupName}" has no id for policy "${spec.name}"`);
		}
		return id;
	};

	return {
		name: spec.name,
		...(spec.description !== undefined ? { description: spec.description } : {}),
		enabled: spec.enabled,
		action: spec.action,
		bidirectional: spec.bidirectional,
		protocol: spec.protocol,
		...(spec.ports !== undefined ? { ports: spec.ports } : {}),
		...(spec.portRanges !== undefined ? { portRanges: spec.portRanges } : {}),
		...(spec.authorizedGroups !== undefined ? { authorizedGroups: spec.authorizedGroups } : {}),
		sources: spec.sourceGroups.map(lookup),
		destinations: spec.destinationGroups.map(lookup),
	};
};
