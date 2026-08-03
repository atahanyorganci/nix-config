import { postureChecksGet } from "@yorganci/netbird-api/postureChecksGet";
import { postureChecksPost } from "@yorganci/netbird-api/postureChecksPost";
import { postureChecksPostureCheckIdDelete } from "@yorganci/netbird-api/postureChecksPostureCheckIdDelete";
import { postureChecksPostureCheckIdGet } from "@yorganci/netbird-api/postureChecksPostureCheckIdGet";
import { postureChecksPostureCheckIdPut } from "@yorganci/netbird-api/postureChecksPostureCheckIdPut";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound, catchNotFoundOrUnavailable } from "../errors.ts";

export interface PostureCheckChecks {
	nbVersionCheck?: { minVersion: string };
	osVersionCheck?: {
		android?: { minVersion: string };
		darwin?: { minVersion: string };
		ios?: { minVersion: string };
		linux?: { minKernelVersion: string };
		windows?: { minKernelVersion: string };
	};
	geoLocationCheck?: {
		locations: ReadonlyArray<{ countryCode: string; cityName?: string }>;
		action: "allow" | "deny";
	};
	peerNetworkRangeCheck?: {
		ranges: ReadonlyArray<string>;
		action: "allow" | "deny";
	};
	processCheck?: {
		processes: ReadonlyArray<{ linuxPath?: string; macPath?: string; windowsPath?: string }>;
	};
}

export interface PostureCheckProps {
	/**
	 * Display name for the posture check. Used as a stable identifier so the
	 * provider can locate the check by name during adoption / state recovery.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	description?: string;
	checks?: PostureCheckChecks;
}

export interface PostureCheckAttributes {
	postureCheckId: string;
	name: string;
	description: string | undefined;
}

export type PostureCheck = Resource<"NetBird.PostureCheck", PostureCheckProps, PostureCheckAttributes>;

/**
 * A NetBird posture check — client version, OS, geo, or network-range gates
 * applied to policy sources.
 *
 * @resource
 * @product Posture Checks
 * @category NetBird
 * @section Creating a Posture Check
 * @example Minimum client version
 * ```typescript
 * const check = yield* NetBird.PostureCheck("MinClient", {
 *   name: "min-client-version",
 *   description: "Require NetBird 0.75+",
 *   checks: {
 *     nbVersionCheck: { minVersion: "0.75.0" },
 *   },
 * });
 * ```
 */
export const PostureCheck = Resource<PostureCheck>("NetBird.PostureCheck");

export const isPostureCheck = (value: unknown): value is PostureCheck =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.PostureCheck";

type ApiPostureCheck = {
	id: string;
	name: string;
	description?: string;
	checks: ApiChecks;
};

type ApiChecks = PostureChecksPostOutputChecks;

type PostureChecksPostOutputChecks = {
	nb_version_check?: { min_version: string };
	os_version_check?: {
		android?: { min_version: string };
		darwin?: { min_version: string };
		ios?: { min_version: string };
		linux?: { min_kernel_version: string };
		windows?: { min_kernel_version: string };
	};
	geo_location_check?: {
		locations: ReadonlyArray<{ country_code: string; city_name?: string }>;
		action: "allow" | "deny";
	};
	peer_network_range_check?: { ranges: ReadonlyArray<string>; action: "allow" | "deny" };
	process_check?: {
		processes: ReadonlyArray<{ linux_path?: string; mac_path?: string; windows_path?: string }>;
	};
};

export const PostureCheckProvider = () =>
	Provider.succeed(PostureCheck, {
		stables: ["postureCheckId", "name"],
		diff: ({ news }) =>
			Effect.sync(() => {
				if (!isResolved(news)) return undefined;
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.postureCheckId) {
				const direct = yield* catchNotFound(postureChecksPostureCheckIdGet({ postureCheckId: output.postureCheckId }));
				if (direct) return toAttributes(direct);
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findPostureCheckByName(name);
			if (!existing) return undefined;
			return toAttributes(existing);
		}),
		list: Effect.fn(function* () {
			const all = yield* postureChecksGet({});
			return all.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as PostureCheckProps);
			const name = yield* resolveName(id, props.name);
			const description = props.description ?? "";
			const checks = toApiChecks(props.checks);

			let observed: ApiPostureCheck | undefined;
			if (output?.postureCheckId) {
				const direct = yield* catchNotFound(postureChecksPostureCheckIdGet({ postureCheckId: output.postureCheckId }));
				if (direct) observed = direct;
			}
			if (!observed) {
				observed = yield* findPostureCheckByName(name);
			}

			if (!observed) {
				const created = yield* postureChecksPost({
					name,
					description,
					...(checks !== undefined ? { checks } : {}),
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findPostureCheckByName(name);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created);
			}

			if (
				observed.name !== name ||
				(observed.description ?? "") !== description ||
				normalizeChecks(checks) !== normalizeChecks(observed.checks)
			) {
				const updated = yield* postureChecksPostureCheckIdPut({
					postureCheckId: observed.id,
					name,
					description,
					...(checks !== undefined ? { checks } : {}),
				});
				return toAttributes(updated);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFoundOrUnavailable(postureChecksPostureCheckIdDelete({ postureCheckId: output.postureCheckId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findPostureCheckByName = (name: string) =>
	postureChecksGet({}).pipe(
		Effect.map(checks => checks.find(check => check.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toAttributes = (check: ApiPostureCheck): PostureCheckAttributes => ({
	postureCheckId: check.id,
	name: check.name,
	description: check.description,
});

const toApiChecks = (checks: PostureCheckChecks | undefined): ApiChecks | undefined => {
	if (checks === undefined) return undefined;
	return {
		...(checks.nbVersionCheck !== undefined
			? { nb_version_check: { min_version: checks.nbVersionCheck.minVersion } }
			: {}),
		...(checks.osVersionCheck !== undefined
			? {
					os_version_check: {
						...(checks.osVersionCheck.android !== undefined
							? { android: { min_version: checks.osVersionCheck.android.minVersion } }
							: {}),
						...(checks.osVersionCheck.darwin !== undefined
							? { darwin: { min_version: checks.osVersionCheck.darwin.minVersion } }
							: {}),
						...(checks.osVersionCheck.ios !== undefined
							? { ios: { min_version: checks.osVersionCheck.ios.minVersion } }
							: {}),
						...(checks.osVersionCheck.linux !== undefined
							? { linux: { min_kernel_version: checks.osVersionCheck.linux.minKernelVersion } }
							: {}),
						...(checks.osVersionCheck.windows !== undefined
							? { windows: { min_kernel_version: checks.osVersionCheck.windows.minKernelVersion } }
							: {}),
					},
				}
			: {}),
		...(checks.geoLocationCheck !== undefined
			? {
					geo_location_check: {
						locations: checks.geoLocationCheck.locations.map(location => ({
							country_code: location.countryCode,
							...(location.cityName !== undefined ? { city_name: location.cityName } : {}),
						})),
						action: checks.geoLocationCheck.action,
					},
				}
			: {}),
		...(checks.peerNetworkRangeCheck !== undefined
			? {
					peer_network_range_check: {
						ranges: [...checks.peerNetworkRangeCheck.ranges],
						action: checks.peerNetworkRangeCheck.action,
					},
				}
			: {}),
		...(checks.processCheck !== undefined
			? {
					process_check: {
						processes: checks.processCheck.processes.map(process => ({
							...(process.linuxPath !== undefined ? { linux_path: process.linuxPath } : {}),
							...(process.macPath !== undefined ? { mac_path: process.macPath } : {}),
							...(process.windowsPath !== undefined ? { windows_path: process.windowsPath } : {}),
						})),
					},
				}
			: {}),
	};
};

const normalizeChecks = (checks: ApiChecks | undefined) => JSON.stringify(checks ?? {});
