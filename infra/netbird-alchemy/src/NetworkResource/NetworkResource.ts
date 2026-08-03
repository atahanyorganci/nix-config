import { networksNetworkIdResourcesGet } from "@yorganci/netbird-api/networksNetworkIdResourcesGet";
import { networksNetworkIdResourcesPost } from "@yorganci/netbird-api/networksNetworkIdResourcesPost";
import { networksNetworkIdResourcesResourceIdDelete } from "@yorganci/netbird-api/networksNetworkIdResourcesResourceIdDelete";
import { networksNetworkIdResourcesResourceIdGet } from "@yorganci/netbird-api/networksNetworkIdResourcesResourceIdGet";
import { networksNetworkIdResourcesResourceIdPut } from "@yorganci/netbird-api/networksNetworkIdResourcesResourceIdPut";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound, catchNotFoundOrUnavailable } from "../errors.ts";

export interface NetworkResourceProps {
	networkId: string;
	/**
	 * Display name for the resource within the network. Used as a stable
	 * identifier during adoption / state recovery.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	description?: string;
	address: string;
	enabled?: boolean;
	groups?: ReadonlyArray<string>;
}

export interface NetworkResourceAttributes {
	resourceId: string;
	networkId: string;
	name: string;
	address: string;
	enabled: boolean;
}

export type NetworkResource = Resource<"NetBird.NetworkResource", NetworkResourceProps, NetworkResourceAttributes>;

/**
 * A NetBird network resource — a host, subnet, or domain reachable via a network.
 *
 * @resource
 * @product Network Resources
 * @category NetBird
 */
export const NetworkResource = Resource<NetworkResource>("NetBird.NetworkResource");

export const isNetworkResource = (value: unknown): value is NetworkResource =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.NetworkResource";

type ApiNetworkResource = {
	id: string;
	name: string;
	description?: string;
	address: string;
	enabled: boolean;
	groups: ReadonlyArray<{ id: string }>;
};

export const NetworkResourceProvider = () =>
	Provider.succeed(NetworkResource, {
		stables: ["resourceId", "name", "networkId"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				if (news.networkId !== olds.networkId) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			const networkId = output?.networkId ?? olds?.networkId;
			if (!networkId) return undefined;

			if (output?.resourceId) {
				const direct = yield* catchNotFound(
					networksNetworkIdResourcesResourceIdGet({
						networkId,
						resourceId: output.resourceId,
					}),
				);
				if (direct) return toAttributes(direct, networkId);
			}

			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findResourceByName(name, networkId);
			if (!existing) return undefined;
			return toAttributes(existing, networkId);
		}),
		list: Effect.fn(function* () {
			return yield* Effect.succeed([] as Array<NetworkResourceAttributes>);
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as NetworkResourceProps);
			if (!props.networkId) {
				return yield* Effect.die(new Error('NetBird.NetworkResource requires "networkId"'));
			}
			if (!props.address) {
				return yield* Effect.die(new Error('NetBird.NetworkResource requires "address"'));
			}

			const name = yield* resolveName(id, props.name);
			const enabled = props.enabled ?? true;
			const groups = props.groups ?? [];

			let observed: ApiNetworkResource | undefined;
			if (output?.resourceId) {
				const direct = yield* catchNotFound(
					networksNetworkIdResourcesResourceIdGet({
						networkId: props.networkId,
						resourceId: output.resourceId,
					}),
				);
				if (direct) observed = direct;
			}
			if (!observed) {
				observed = yield* findResourceByName(name, props.networkId);
			}

			if (!observed) {
				const created = yield* networksNetworkIdResourcesPost({
					networkId: props.networkId,
					name,
					...(props.description !== undefined ? { description: props.description } : {}),
					address: props.address,
					enabled,
					groups: [...groups],
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findResourceByName(name, props.networkId);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created, props.networkId);
			}

			const observedGroupIds = observed.groups.map(group => group.id).sort();
			const desiredGroupIds = [...groups].sort();
			const groupsChanged =
				observedGroupIds.length !== desiredGroupIds.length ||
				observedGroupIds.some((groupId, index) => groupId !== desiredGroupIds[index]);

			if (
				observed.name !== name ||
				observed.description !== props.description ||
				observed.address !== props.address ||
				observed.enabled !== enabled ||
				groupsChanged
			) {
				const updated = yield* networksNetworkIdResourcesResourceIdPut({
					networkId: props.networkId,
					resourceId: observed.id,
					name,
					...(props.description !== undefined ? { description: props.description } : {}),
					address: props.address,
					enabled,
					groups: [...groups],
				});
				return toAttributes(updated, props.networkId);
			}

			return toAttributes(observed, props.networkId);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFoundOrUnavailable(
				networksNetworkIdResourcesResourceIdDelete({
					networkId: output.networkId,
					resourceId: output.resourceId,
				}),
			);
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findResourceByName = (name: string, networkId: string) =>
	networksNetworkIdResourcesGet({ networkId }).pipe(
		Effect.map(resources => resources.find(resource => resource.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toAttributes = (resource: ApiNetworkResource, networkId: string): NetworkResourceAttributes => ({
	resourceId: resource.id,
	networkId,
	name: resource.name,
	address: resource.address,
	enabled: resource.enabled,
});
