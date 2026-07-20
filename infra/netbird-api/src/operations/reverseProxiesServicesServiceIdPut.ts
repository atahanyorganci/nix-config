import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound, Conflict } from "../errors.ts";
import { SensitiveString, SensitiveOutputString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface ReverseProxiesServicesServiceIdPutInput {
	serviceId: string;
	name: string;
	domain: string;
	mode?: "http" | "tcp" | "udp" | "tls";
	listen_port?: number;
	targets?: ReadonlyArray<{
		target_id: string;
		target_type: "peer" | "host" | "domain" | "subnet" | "cluster";
		path?: string;
		protocol: "http" | "https" | "tcp" | "udp";
		host?: string;
		port: number;
		enabled: boolean;
		options?: {
			skip_tls_verify?: boolean;
			request_timeout?: string;
			path_rewrite?: "preserve";
			custom_headers?: Record<string, string>;
			proxy_protocol?: boolean;
			session_idle_timeout?: string;
			direct_upstream?: boolean;
		};
	}>;
	enabled: boolean;
	pass_host_header?: boolean;
	rewrite_redirects?: boolean;
	auth?: {
		password_auth?: { enabled: boolean; password: string | Redacted.Redacted<string> };
		pin_auth?: { enabled: boolean; pin: string };
		bearer_auth?: { enabled: boolean; distribution_groups?: ReadonlyArray<string> | null };
		link_auth?: { enabled: boolean };
		header_auths?: ReadonlyArray<{ enabled: boolean; header: string; value: string }>;
	};
	access_restrictions?: {
		allowed_cidrs?: ReadonlyArray<string>;
		blocked_cidrs?: ReadonlyArray<string>;
		allowed_countries?: ReadonlyArray<string>;
		blocked_countries?: ReadonlyArray<string>;
		crowdsec_mode?: "off" | "enforce" | "observe";
	};
	private?: boolean;
	access_groups?: ReadonlyArray<string>;
}
export const ReverseProxiesServicesServiceIdPutInput = /*@__PURE__*/ Schema.Struct({
	serviceId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	domain: Schema.String,
	mode: Schema.optional(Schema.Literals(["http", "tcp", "udp", "tls"])),
	listen_port: Schema.optional(Schema.Number),
	targets: Schema.optional(
		Schema.Array(
			Schema.Struct({
				target_id: Schema.String,
				target_type: Schema.Literals(["peer", "host", "domain", "subnet", "cluster"]),
				path: Schema.optional(Schema.String),
				protocol: Schema.Literals(["http", "https", "tcp", "udp"]),
				host: Schema.optional(Schema.String),
				port: Schema.Number,
				enabled: Schema.Boolean,
				options: Schema.optional(
					Schema.Struct({
						skip_tls_verify: Schema.optional(Schema.Boolean),
						request_timeout: Schema.optional(Schema.String),
						path_rewrite: Schema.optional(Schema.Literals(["preserve"])),
						custom_headers: Schema.optional(Schema.Record(Schema.String, Schema.String)),
						proxy_protocol: Schema.optional(Schema.Boolean),
						session_idle_timeout: Schema.optional(Schema.String),
						direct_upstream: Schema.optional(Schema.Boolean),
					}),
				),
			}),
		),
	),
	enabled: Schema.Boolean,
	pass_host_header: Schema.optional(Schema.Boolean),
	rewrite_redirects: Schema.optional(Schema.Boolean),
	auth: Schema.optional(
		Schema.Struct({
			password_auth: Schema.optional(
				Schema.Struct({
					enabled: Schema.Boolean,
					password: SensitiveString,
				}),
			),
			pin_auth: Schema.optional(
				Schema.Struct({
					enabled: Schema.Boolean,
					pin: Schema.String,
				}),
			),
			bearer_auth: Schema.optional(
				Schema.Struct({
					enabled: Schema.Boolean,
					distribution_groups: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
				}),
			),
			link_auth: Schema.optional(
				Schema.Struct({
					enabled: Schema.Boolean,
				}),
			),
			header_auths: Schema.optional(
				Schema.Array(
					Schema.Struct({
						enabled: Schema.Boolean,
						header: Schema.String,
						value: Schema.String,
					}),
				),
			),
		}),
	),
	access_restrictions: Schema.optional(
		Schema.Struct({
			allowed_cidrs: Schema.optional(Schema.Array(Schema.String)),
			blocked_cidrs: Schema.optional(Schema.Array(Schema.String)),
			allowed_countries: Schema.optional(Schema.Array(Schema.String)),
			blocked_countries: Schema.optional(Schema.Array(Schema.String)),
			crowdsec_mode: Schema.optional(Schema.Literals(["off", "enforce", "observe"])),
		}),
	),
	private: Schema.optional(Schema.Boolean),
	access_groups: Schema.optional(Schema.Array(Schema.String)),
}).pipe(
	T.Http({ method: "PUT", path: "/api/reverse-proxies/services/{serviceId}" }),
) as unknown as Schema.Codec<ReverseProxiesServicesServiceIdPutInput>;

// Output Schema
export interface ReverseProxiesServicesServiceIdPutOutput {
	id: string;
	name: string;
	domain: string;
	mode?: "http" | "tcp" | "udp" | "tls";
	listen_port?: number;
	port_auto_assigned?: boolean;
	proxy_cluster?: string;
	targets: ReadonlyArray<{
		target_id: string;
		target_type: "peer" | "host" | "domain" | "subnet" | "cluster";
		path?: string;
		protocol: "http" | "https" | "tcp" | "udp";
		host?: string;
		port: number;
		enabled: boolean;
		options?: {
			skip_tls_verify?: boolean;
			request_timeout?: string;
			path_rewrite?: "preserve";
			custom_headers?: Record<string, string>;
			proxy_protocol?: boolean;
			session_idle_timeout?: string;
			direct_upstream?: boolean;
		};
	}>;
	enabled: boolean;
	terminated?: boolean;
	pass_host_header?: boolean;
	rewrite_redirects?: boolean;
	auth: {
		password_auth?: { enabled: boolean; password: Redacted.Redacted<string> };
		pin_auth?: { enabled: boolean; pin: string };
		bearer_auth?: { enabled: boolean; distribution_groups?: ReadonlyArray<string> | null };
		link_auth?: { enabled: boolean };
		header_auths?: ReadonlyArray<{ enabled: boolean; header: string; value: string }>;
	};
	access_restrictions?: {
		allowed_cidrs?: ReadonlyArray<string>;
		blocked_cidrs?: ReadonlyArray<string>;
		allowed_countries?: ReadonlyArray<string>;
		blocked_countries?: ReadonlyArray<string>;
		crowdsec_mode?: "off" | "enforce" | "observe";
	};
	meta: {
		created_at: string;
		certificate_issued_at?: string;
		status: "pending" | "active" | "tunnel_not_created" | "certificate_pending" | "certificate_failed" | "error";
	};
	private?: boolean;
	access_groups?: ReadonlyArray<string>;
}
export const ReverseProxiesServicesServiceIdPutOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	domain: Schema.String,
	mode: Schema.optional(Schema.Literals(["http", "tcp", "udp", "tls"])),
	listen_port: Schema.optional(Schema.Number),
	port_auto_assigned: Schema.optional(Schema.Boolean),
	proxy_cluster: Schema.optional(Schema.String),
	targets: Schema.Array(
		Schema.Struct({
			target_id: Schema.String,
			target_type: Schema.Literals(["peer", "host", "domain", "subnet", "cluster"]),
			path: Schema.optional(Schema.String),
			protocol: Schema.Literals(["http", "https", "tcp", "udp"]),
			host: Schema.optional(Schema.String),
			port: Schema.Number,
			enabled: Schema.Boolean,
			options: Schema.optional(
				Schema.Struct({
					skip_tls_verify: Schema.optional(Schema.Boolean),
					request_timeout: Schema.optional(Schema.String),
					path_rewrite: Schema.optional(Schema.Literals(["preserve"])),
					custom_headers: Schema.optional(Schema.Record(Schema.String, Schema.String)),
					proxy_protocol: Schema.optional(Schema.Boolean),
					session_idle_timeout: Schema.optional(Schema.String),
					direct_upstream: Schema.optional(Schema.Boolean),
				}),
			),
		}),
	),
	enabled: Schema.Boolean,
	terminated: Schema.optional(Schema.Boolean),
	pass_host_header: Schema.optional(Schema.Boolean),
	rewrite_redirects: Schema.optional(Schema.Boolean),
	auth: Schema.Struct({
		password_auth: Schema.optional(
			Schema.Struct({
				enabled: Schema.Boolean,
				password: SensitiveOutputString,
			}),
		),
		pin_auth: Schema.optional(
			Schema.Struct({
				enabled: Schema.Boolean,
				pin: Schema.String,
			}),
		),
		bearer_auth: Schema.optional(
			Schema.Struct({
				enabled: Schema.Boolean,
				distribution_groups: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
			}),
		),
		link_auth: Schema.optional(
			Schema.Struct({
				enabled: Schema.Boolean,
			}),
		),
		header_auths: Schema.optional(
			Schema.Array(
				Schema.Struct({
					enabled: Schema.Boolean,
					header: Schema.String,
					value: Schema.String,
				}),
			),
		),
	}),
	access_restrictions: Schema.optional(
		Schema.Struct({
			allowed_cidrs: Schema.optional(Schema.Array(Schema.String)),
			blocked_cidrs: Schema.optional(Schema.Array(Schema.String)),
			allowed_countries: Schema.optional(Schema.Array(Schema.String)),
			blocked_countries: Schema.optional(Schema.Array(Schema.String)),
			crowdsec_mode: Schema.optional(Schema.Literals(["off", "enforce", "observe"])),
		}),
	),
	meta: Schema.Struct({
		created_at: Schema.String,
		certificate_issued_at: Schema.optional(Schema.String),
		status: Schema.Literals([
			"pending",
			"active",
			"tunnel_not_created",
			"certificate_pending",
			"certificate_failed",
			"error",
		]),
	}),
	private: Schema.optional(Schema.Boolean),
	access_groups: Schema.optional(Schema.Array(Schema.String)),
}) as unknown as Schema.Codec<ReverseProxiesServicesServiceIdPutOutput>;

// The operation
/**
 * Update a Service
 *
 * Update an existing service
 *
 * @param serviceId - The unique identifier of a service
 */
export const reverseProxiesServicesServiceIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: ReverseProxiesServicesServiceIdPutInput,
	outputSchema: ReverseProxiesServicesServiceIdPutOutput,
	errors: [BadRequest, Forbidden, NotFound, Conflict] as const,
}));
