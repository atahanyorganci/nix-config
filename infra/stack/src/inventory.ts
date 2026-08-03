import * as Schema from "effect/Schema";

export const NetBirdGroupName = Schema.Literals(["Admin", "Users", "Servers", "Agents"]);
export type NetBirdGroupName = typeof NetBirdGroupName.Type;

export const ZERO_TRUST_GROUP_NAMES: ReadonlyArray<NetBirdGroupName> = ["Admin", "Users", "Servers", "Agents"];

/**
 * Infra roles — membership managed as peer lists from inventory / setup keys.
 * Admin and Users are login roles: NetBird user `auto_groups` populate them,
 * so the stack never rewrites their members.
 */
export const PEER_GROUP_NAMES: ReadonlyArray<NetBirdGroupName> = ["Servers", "Agents"];

export const isPeerGroupName = (value: NetBirdGroupName): boolean =>
	(PEER_GROUP_NAMES as ReadonlyArray<string>).includes(value);

export const isNetBirdGroupName = (value: string): value is NetBirdGroupName =>
	(ZERO_TRUST_GROUP_NAMES as ReadonlyArray<string>).includes(value);

/** Group names accepted as policy sources: the zero-trust groups plus NetBird's built-in All group. */
export const PolicySourceGroupName = Schema.Literals(["Admin", "Users", "Servers", "Agents", "All"]);
export type PolicySourceGroupName = typeof PolicySourceGroupName.Type;

export const isPolicySourceGroupName = (value: string): value is PolicySourceGroupName =>
	value === "All" || isNetBirdGroupName(value);

export const InventoryHost = Schema.Struct({
	name: Schema.String,
	system: Schema.String,
	role: Schema.NullOr(Schema.Literals(["agentHolder", "managedTarget"])),
	netbird: Schema.Struct({
		group: Schema.NullOr(NetBirdGroupName),
		loginExpirationEnabled: Schema.Boolean,
		inactivityExpirationEnabled: Schema.Boolean,
	}),
});
export type InventoryHost = typeof InventoryHost.Type;

export const Inventory = Schema.Struct({
	managedTargets: Schema.Record(Schema.String, InventoryHost),
	agentHolders: Schema.Record(Schema.String, InventoryHost),
});
export type Inventory = typeof Inventory.Type;

export const inventoryHosts = (inventory: Inventory): ReadonlyArray<[string, InventoryHost]> => [
	...(Object.entries(inventory.managedTargets) as Array<[string, InventoryHost]>),
	...(Object.entries(inventory.agentHolders) as Array<[string, InventoryHost]>),
];

export const hostsByNetBirdGroup = (inventory: Inventory) => {
	const grouped = new Map<NetBirdGroupName, Array<string>>();
	for (const groupName of ZERO_TRUST_GROUP_NAMES) {
		grouped.set(groupName, []);
	}
	for (const [hostKey, host] of inventoryHosts(inventory)) {
		if (host.netbird.group) {
			grouped.get(host.netbird.group)!.push(hostKey);
		}
	}
	return grouped;
};
