import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdPutInput {
	id: number;
	name?: string;
	labels?: Record<string, string>;
}
export const ServersIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	name: Schema.optional(Schema.String),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "PUT", path: "/servers/{id}" })) as unknown as Schema.Codec<ServersIdPutInput>;

// Output Schema
export interface ServersIdPutOutput {
	server?: {
		id: number;
		name: string;
		status:
			| "running"
			| "initializing"
			| "starting"
			| "stopping"
			| "off"
			| "deleting"
			| "migrating"
			| "rebuilding"
			| "unknown";
		created: string;
		public_net: {
			ipv4: { id?: number; ip: string; blocked: boolean; dns_ptr: string } | null;
			ipv6: {
				id?: number;
				ip: string;
				blocked: boolean;
				dns_ptr: ReadonlyArray<{ ip: string; dns_ptr: string }> | null;
			} | null;
			floating_ips: ReadonlyArray<number>;
			firewalls?: ReadonlyArray<{ id?: number; status?: "applied" | "pending" }>;
		};
		private_net: ReadonlyArray<{
			network?: number;
			ip?: string;
			alias_ips?: ReadonlyArray<string>;
			mac_address?: string;
		}>;
		server_type: {
			id: number;
			name: string;
			description: string;
			cores: number;
			memory: number;
			disk: number;
			deprecated: boolean;
			prices: ReadonlyArray<{
				location: string;
				price_hourly: { net: string; gross: string };
				price_monthly: { net: string; gross: string };
				included_traffic: number;
				price_per_tb_traffic: { net: string; gross: string };
			}>;
			storage_type: "local" | "network";
			cpu_type: "shared" | "dedicated";
			category?: string;
			architecture: "x86" | "arm";
			deprecation?: { unavailable_after: string; announced: string } | null;
			locations: ReadonlyArray<{
				id: number;
				name: string;
				deprecation: { unavailable_after: string; announced: string } | null;
				recommended: boolean;
				available: boolean;
			}>;
		};
		location: {
			id: number;
			name: string;
			description: string;
			country: string;
			city: string;
			latitude: number;
			longitude: number;
			network_zone: string;
		};
		image: {
			id: number;
			type: "system" | "app" | "snapshot" | "backup";
			status: "available" | "creating" | "unavailable";
			name: string | null;
			description: string;
			image_size: number | null;
			disk_size: number;
			created: string;
			created_from: { id: number; name: string } | null;
			bound_to: number | null;
			os_flavor: "ubuntu" | "centos" | "debian" | "fedora" | "rocky" | "alma" | "opensuse" | "unknown";
			os_version: string | null;
			rapid_deploy?: boolean;
			protection: { delete: boolean };
			deprecated: string | null;
			deleted: string | null;
			labels: Record<string, string>;
			architecture: "x86" | "arm";
		} | null;
		iso: {
			id: number;
			name: string | null;
			description: string;
			type: "public" | "private" | null;
			deprecation: { unavailable_after: string; announced: string } | null;
			architecture: "x86" | "arm" | null;
		} | null;
		rescue_enabled: boolean;
		locked: boolean;
		backup_window: string | null;
		outgoing_traffic: number | null;
		ingoing_traffic: number | null;
		included_traffic: number | null;
		protection: { delete: boolean; rebuild: boolean };
		labels: Record<string, string>;
		volumes?: ReadonlyArray<number>;
		load_balancers?: ReadonlyArray<number>;
		primary_disk_size: number;
		placement_group?: {
			id: number;
			name: string;
			labels: Record<string, string>;
			type: "spread";
			created: string;
			servers: ReadonlyArray<number>;
		} | null;
	};
}
export const ServersIdPutOutput = /*@__PURE__*/ Schema.Struct({
	server: Schema.optional(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			status: Schema.Literals([
				"running",
				"initializing",
				"starting",
				"stopping",
				"off",
				"deleting",
				"migrating",
				"rebuilding",
				"unknown",
			]),
			created: Schema.String,
			public_net: Schema.Struct({
				ipv4: Schema.NullOr(
					Schema.Struct({
						id: Schema.optional(Schema.Number),
						ip: Schema.String,
						blocked: Schema.Boolean,
						dns_ptr: Schema.String,
					}),
				),
				ipv6: Schema.NullOr(
					Schema.Struct({
						id: Schema.optional(Schema.Number),
						ip: Schema.String,
						blocked: Schema.Boolean,
						dns_ptr: Schema.NullOr(
							Schema.Array(
								Schema.Struct({
									ip: Schema.String,
									dns_ptr: Schema.String,
								}),
							),
						),
					}),
				),
				floating_ips: Schema.Array(Schema.Number),
				firewalls: Schema.optional(
					Schema.Array(
						Schema.Struct({
							id: Schema.optional(Schema.Number),
							status: Schema.optional(Schema.Literals(["applied", "pending"])),
						}),
					),
				),
			}),
			private_net: Schema.Array(
				Schema.Struct({
					network: Schema.optional(Schema.Number),
					ip: Schema.optional(Schema.String),
					alias_ips: Schema.optional(Schema.Array(Schema.String)),
					mac_address: Schema.optional(Schema.String),
				}),
			),
			server_type: Schema.Struct({
				id: Schema.Number,
				name: Schema.String,
				description: Schema.String,
				cores: Schema.Number,
				memory: Schema.Number,
				disk: Schema.Number,
				deprecated: Schema.Boolean,
				prices: Schema.Array(
					Schema.Struct({
						location: Schema.String,
						price_hourly: Schema.Struct({
							net: Schema.String,
							gross: Schema.String,
						}),
						price_monthly: Schema.Struct({
							net: Schema.String,
							gross: Schema.String,
						}),
						included_traffic: Schema.Number,
						price_per_tb_traffic: Schema.Struct({
							net: Schema.String,
							gross: Schema.String,
						}),
					}),
				),
				storage_type: Schema.Literals(["local", "network"]),
				cpu_type: Schema.Literals(["shared", "dedicated"]),
				category: Schema.optional(Schema.String),
				architecture: Schema.Literals(["x86", "arm"]),
				deprecation: Schema.optional(
					Schema.NullOr(
						Schema.Struct({
							unavailable_after: Schema.String,
							announced: Schema.String,
						}),
					),
				),
				locations: Schema.Array(
					Schema.Struct({
						id: Schema.Number,
						name: Schema.String,
						deprecation: Schema.NullOr(
							Schema.Struct({
								unavailable_after: Schema.String,
								announced: Schema.String,
							}),
						),
						recommended: Schema.Boolean,
						available: Schema.Boolean,
					}),
				),
			}),
			location: Schema.Struct({
				id: Schema.Number,
				name: Schema.String,
				description: Schema.String,
				country: Schema.String,
				city: Schema.String,
				latitude: Schema.Number,
				longitude: Schema.Number,
				network_zone: Schema.String,
			}),
			image: Schema.NullOr(
				Schema.Struct({
					id: Schema.Number,
					type: Schema.Literals(["system", "app", "snapshot", "backup"]),
					status: Schema.Literals(["available", "creating", "unavailable"]),
					name: Schema.NullOr(Schema.String),
					description: Schema.String,
					image_size: Schema.NullOr(Schema.Number),
					disk_size: Schema.Number,
					created: Schema.String,
					created_from: Schema.NullOr(
						Schema.Struct({
							id: Schema.Number,
							name: Schema.String,
						}),
					),
					bound_to: Schema.NullOr(Schema.Number),
					os_flavor: Schema.Literals(["ubuntu", "centos", "debian", "fedora", "rocky", "alma", "opensuse", "unknown"]),
					os_version: Schema.NullOr(Schema.String),
					rapid_deploy: Schema.optional(Schema.Boolean),
					protection: Schema.Struct({
						delete: Schema.Boolean,
					}),
					deprecated: Schema.NullOr(Schema.String),
					deleted: Schema.NullOr(Schema.String),
					labels: Schema.Record(Schema.String, Schema.String),
					architecture: Schema.Literals(["x86", "arm"]),
				}),
			),
			iso: Schema.NullOr(
				Schema.Struct({
					id: Schema.Number,
					name: Schema.NullOr(Schema.String),
					description: Schema.String,
					type: Schema.NullOr(Schema.Literals(["public", "private"])),
					deprecation: Schema.NullOr(
						Schema.Struct({
							unavailable_after: Schema.String,
							announced: Schema.String,
						}),
					),
					architecture: Schema.NullOr(Schema.Literals(["x86", "arm"])),
				}),
			),
			rescue_enabled: Schema.Boolean,
			locked: Schema.Boolean,
			backup_window: Schema.NullOr(Schema.String),
			outgoing_traffic: Schema.NullOr(Schema.Number),
			ingoing_traffic: Schema.NullOr(Schema.Number),
			included_traffic: Schema.NullOr(Schema.Number),
			protection: Schema.Struct({
				delete: Schema.Boolean,
				rebuild: Schema.Boolean,
			}),
			labels: Schema.Record(Schema.String, Schema.String),
			volumes: Schema.optional(Schema.Array(Schema.Number)),
			load_balancers: Schema.optional(Schema.Array(Schema.Number)),
			primary_disk_size: Schema.Number,
			placement_group: Schema.optional(
				Schema.NullOr(
					Schema.Struct({
						id: Schema.Number,
						name: Schema.String,
						labels: Schema.Record(Schema.String, Schema.String),
						type: Schema.Literals(["spread"]),
						created: Schema.String,
						servers: Schema.Array(Schema.Number),
					}),
				),
			),
		}),
	),
}) as unknown as Schema.Codec<ServersIdPutOutput>;

// The operation
/**
 * Update a Server
 *
 * Updates a Server. You can update a Server’s name and a Server’s labels.
 * Please note that Server names must be unique per Project and valid hostnames as per RFC 1123 (i.e. may only contain letters, digits, periods, and dashes).
 *
 * @param id - ID of the Server.
 */
export const serversIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdPutInput,
	outputSchema: ServersIdPutOutput,
}));
