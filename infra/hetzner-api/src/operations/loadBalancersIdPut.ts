import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdPutInput {
	id: number;
	name?: string;
	labels?: Record<string, string>;
}
export const LoadBalancersIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	name: Schema.optional(Schema.String),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(T.Http({ method: "PUT", path: "/load_balancers/{id}" })) as unknown as Schema.Codec<LoadBalancersIdPutInput>;

// Output Schema
export interface LoadBalancersIdPutOutput {
	load_balancer: {
		id: number;
		name: string;
		public_net: {
			enabled: boolean;
			ipv4: { ip: string | null; dns_ptr: string | null };
			ipv6: { ip: string | null; dns_ptr: string | null };
		};
		private_net: ReadonlyArray<{ network: number; ip: string }>;
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
		load_balancer_type: {
			id: number;
			name: string;
			description: string;
			max_connections: number;
			max_services: number;
			max_targets: number;
			max_assigned_certificates: number;
			deprecated: string | null;
			deprecation: { unavailable_after: string; announced: string } | null;
			prices: ReadonlyArray<{
				location: string;
				price_hourly: { net: string; gross: string };
				price_monthly: { net: string; gross: string };
				included_traffic: number;
				price_per_tb_traffic: { net: string; gross: string };
			}>;
		};
		protection: { delete: boolean };
		labels: Record<string, string>;
		created: string;
		services: ReadonlyArray<
			| {
					protocol: "tcp";
					listen_port: number;
					destination_port: number;
					proxyprotocol: boolean;
					health_check: {
						protocol: "tcp" | "http";
						port: number;
						interval: number;
						timeout: number;
						retries: number;
						http?: {
							domain: string | null;
							path: string;
							response?: string;
							status_codes?: ReadonlyArray<string>;
							tls?: boolean;
						};
					};
			  }
			| {
					protocol: "http";
					listen_port: number;
					destination_port: number;
					proxyprotocol: boolean;
					health_check: {
						protocol: "tcp" | "http";
						port: number;
						interval: number;
						timeout: number;
						retries: number;
						http?: {
							domain: string | null;
							path: string;
							response?: string;
							status_codes?: ReadonlyArray<string>;
							tls?: boolean;
						};
					};
					http: { cookie_name: string; cookie_lifetime: number; timeout_idle: number; sticky_sessions: boolean };
			  }
			| {
					protocol: "https";
					listen_port: number;
					destination_port: number;
					proxyprotocol: boolean;
					health_check: {
						protocol: "tcp" | "http";
						port: number;
						interval: number;
						timeout: number;
						retries: number;
						http?: {
							domain: string | null;
							path: string;
							response?: string;
							status_codes?: ReadonlyArray<string>;
							tls?: boolean;
						};
					};
					http: {
						cookie_name: string;
						cookie_lifetime: number;
						timeout_idle: number;
						certificates: ReadonlyArray<number>;
						redirect_http: boolean;
						sticky_sessions: boolean;
					};
			  }
		>;
		targets: ReadonlyArray<
			| {
					type: "server";
					server: { id: number; ip: string };
					health_status: ReadonlyArray<{ listen_port: number; status: "healthy" | "unhealthy" | "unknown" }>;
					use_private_ip: boolean;
			  }
			| {
					type: "label_selector";
					label_selector: { selector: string };
					targets: ReadonlyArray<{
						type: string;
						server: { id: number; ip: string };
						health_status: ReadonlyArray<{ listen_port: number; status: "healthy" | "unhealthy" | "unknown" }>;
						use_private_ip: boolean;
					}>;
					use_private_ip: boolean;
			  }
			| {
					type: "ip";
					ip: { ip: string };
					health_status: ReadonlyArray<{ listen_port: number; status: "healthy" | "unhealthy" | "unknown" }>;
			  }
		>;
		algorithm: { type: "round_robin" | "least_connections" };
		outgoing_traffic: number | null;
		ingoing_traffic: number | null;
		included_traffic: number;
	};
}
export const LoadBalancersIdPutOutput = /*@__PURE__*/ Schema.Struct({
	load_balancer: Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		public_net: Schema.Struct({
			enabled: Schema.Boolean,
			ipv4: Schema.Struct({
				ip: Schema.NullOr(Schema.String),
				dns_ptr: Schema.NullOr(Schema.String),
			}),
			ipv6: Schema.Struct({
				ip: Schema.NullOr(Schema.String),
				dns_ptr: Schema.NullOr(Schema.String),
			}),
		}),
		private_net: Schema.Array(
			Schema.Struct({
				network: Schema.Number,
				ip: Schema.String,
			}),
		),
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
		load_balancer_type: Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			description: Schema.String,
			max_connections: Schema.Number,
			max_services: Schema.Number,
			max_targets: Schema.Number,
			max_assigned_certificates: Schema.Number,
			deprecated: Schema.NullOr(Schema.String),
			deprecation: Schema.NullOr(
				Schema.Struct({
					unavailable_after: Schema.String,
					announced: Schema.String,
				}),
			),
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
		}),
		protection: Schema.Struct({
			delete: Schema.Boolean,
		}),
		labels: Schema.Record(Schema.String, Schema.String),
		created: Schema.String,
		services: Schema.Array(
			Schema.Union([
				Schema.Struct({
					protocol: Schema.Literals(["tcp"]),
					listen_port: Schema.Number,
					destination_port: Schema.Number,
					proxyprotocol: Schema.Boolean,
					health_check: Schema.Struct({
						protocol: Schema.Literals(["tcp", "http"]),
						port: Schema.Number,
						interval: Schema.Number,
						timeout: Schema.Number,
						retries: Schema.Number,
						http: Schema.optional(
							Schema.Struct({
								domain: Schema.NullOr(Schema.String),
								path: Schema.String,
								response: Schema.optional(Schema.String),
								status_codes: Schema.optional(Schema.Array(Schema.String)),
								tls: Schema.optional(Schema.Boolean),
							}),
						),
					}),
				}),
				Schema.Struct({
					protocol: Schema.Literals(["http"]),
					listen_port: Schema.Number,
					destination_port: Schema.Number,
					proxyprotocol: Schema.Boolean,
					health_check: Schema.Struct({
						protocol: Schema.Literals(["tcp", "http"]),
						port: Schema.Number,
						interval: Schema.Number,
						timeout: Schema.Number,
						retries: Schema.Number,
						http: Schema.optional(
							Schema.Struct({
								domain: Schema.NullOr(Schema.String),
								path: Schema.String,
								response: Schema.optional(Schema.String),
								status_codes: Schema.optional(Schema.Array(Schema.String)),
								tls: Schema.optional(Schema.Boolean),
							}),
						),
					}),
					http: Schema.Struct({
						cookie_name: Schema.String,
						cookie_lifetime: Schema.Number,
						timeout_idle: Schema.Number,
						sticky_sessions: Schema.Boolean,
					}),
				}),
				Schema.Struct({
					protocol: Schema.Literals(["https"]),
					listen_port: Schema.Number,
					destination_port: Schema.Number,
					proxyprotocol: Schema.Boolean,
					health_check: Schema.Struct({
						protocol: Schema.Literals(["tcp", "http"]),
						port: Schema.Number,
						interval: Schema.Number,
						timeout: Schema.Number,
						retries: Schema.Number,
						http: Schema.optional(
							Schema.Struct({
								domain: Schema.NullOr(Schema.String),
								path: Schema.String,
								response: Schema.optional(Schema.String),
								status_codes: Schema.optional(Schema.Array(Schema.String)),
								tls: Schema.optional(Schema.Boolean),
							}),
						),
					}),
					http: Schema.Struct({
						cookie_name: Schema.String,
						cookie_lifetime: Schema.Number,
						timeout_idle: Schema.Number,
						certificates: Schema.Array(Schema.Number),
						redirect_http: Schema.Boolean,
						sticky_sessions: Schema.Boolean,
					}),
				}),
			]),
		),
		targets: Schema.Array(
			Schema.Union([
				Schema.Struct({
					type: Schema.Literals(["server"]),
					server: Schema.Struct({
						id: Schema.Number,
						ip: Schema.String,
					}),
					health_status: Schema.Array(
						Schema.Struct({
							listen_port: Schema.Number,
							status: Schema.Literals(["healthy", "unhealthy", "unknown"]),
						}),
					),
					use_private_ip: Schema.Boolean,
				}),
				Schema.Struct({
					type: Schema.Literals(["label_selector"]),
					label_selector: Schema.Struct({
						selector: Schema.String,
					}),
					targets: Schema.Array(
						Schema.Struct({
							type: Schema.String,
							server: Schema.Struct({
								id: Schema.Number,
								ip: Schema.String,
							}),
							health_status: Schema.Array(
								Schema.Struct({
									listen_port: Schema.Number,
									status: Schema.Literals(["healthy", "unhealthy", "unknown"]),
								}),
							),
							use_private_ip: Schema.Boolean,
						}),
					),
					use_private_ip: Schema.Boolean,
				}),
				Schema.Struct({
					type: Schema.Literals(["ip"]),
					ip: Schema.Struct({
						ip: Schema.String,
					}),
					health_status: Schema.Array(
						Schema.Struct({
							listen_port: Schema.Number,
							status: Schema.Literals(["healthy", "unhealthy", "unknown"]),
						}),
					),
				}),
			]),
		),
		algorithm: Schema.Struct({
			type: Schema.Literals(["round_robin", "least_connections"]),
		}),
		outgoing_traffic: Schema.NullOr(Schema.Number),
		ingoing_traffic: Schema.NullOr(Schema.Number),
		included_traffic: Schema.Number,
	}),
}) as unknown as Schema.Codec<LoadBalancersIdPutOutput>;

// The operation
/**
 * Update a Load Balancer
 *
 * Updates a Load Balancer. You can update a Load Balancer’s name and a Load Balancer’s labels.
 * Note: if the Load Balancer object changes during the request, the response will be a “conflict” error.
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdPutInput,
	outputSchema: LoadBalancersIdPutOutput,
}));
