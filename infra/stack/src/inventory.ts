import * as Schema from "effect/Schema";

export const NetBirdGroupName = Schema.Literals(["Admin", "Users", "Servers", "Agents"]);
export type NetBirdGroupName = typeof NetBirdGroupName.Type;

export const ZERO_TRUST_GROUP_NAMES: ReadonlyArray<NetBirdGroupName> = ["Admin", "Users", "Servers", "Agents"];

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
