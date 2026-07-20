import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsAddServicePostInput {
	id: number;
	protocol: "tcp" | "http" | "https";
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
			domain?: string | null;
			path?: string;
			response?: string;
			status_codes?: ReadonlyArray<string>;
			tls?: boolean;
		};
	};
	http?: {
		cookie_name?: string;
		cookie_lifetime?: number;
		timeout_idle?: number;
		certificates?: ReadonlyArray<number>;
		redirect_http?: boolean;
		sticky_sessions?: boolean;
	};
}
export const LoadBalancersIdActionsAddServicePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	protocol: Schema.Literals(["tcp", "http", "https"]),
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
				domain: Schema.optional(Schema.NullOr(Schema.String)),
				path: Schema.optional(Schema.String),
				response: Schema.optional(Schema.String),
				status_codes: Schema.optional(Schema.Array(Schema.String)),
				tls: Schema.optional(Schema.Boolean),
			}),
		),
	}),
	http: Schema.optional(
		Schema.Struct({
			cookie_name: Schema.optional(Schema.String),
			cookie_lifetime: Schema.optional(Schema.Number),
			timeout_idle: Schema.optional(Schema.Number),
			certificates: Schema.optional(Schema.Array(Schema.Number)),
			redirect_http: Schema.optional(Schema.Boolean),
			sticky_sessions: Schema.optional(Schema.Boolean),
		}),
	),
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/add_service" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsAddServicePostInput>;

// Output Schema
export interface LoadBalancersIdActionsAddServicePostOutput {
	action: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	};
}
export const LoadBalancersIdActionsAddServicePostOutput = /*@__PURE__*/ Schema.Struct({
	action: Schema.Struct({
		id: Schema.Number,
		command: Schema.String,
		status: Schema.Literals(["running", "success", "error"]),
		started: Schema.String,
		finished: Schema.NullOr(Schema.String),
		progress: Schema.Number,
		resources: Schema.Array(
			Schema.Struct({
				id: Schema.Number,
				type: Schema.String,
			}),
		),
		error: Schema.NullOr(
			Schema.Struct({
				code: Schema.String,
				message: Schema.String,
			}),
		),
	}),
}) as unknown as Schema.Codec<LoadBalancersIdActionsAddServicePostOutput>;

// The operation
/**
 * Add Service
 *
 * Adds a service to a Load Balancer.
 * #### Operation specific errors
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsAddServicePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsAddServicePostInput,
	outputSchema: LoadBalancersIdActionsAddServicePostOutput,
}));
