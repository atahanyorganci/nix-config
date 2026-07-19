import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PeersPeerIdPutInput {
	peerId: string;
	name: string;
	ssh_enabled: boolean;
	login_expiration_enabled: boolean;
	inactivity_expiration_enabled: boolean;
	approval_required?: boolean;
	ip?: string;
	ipv6?: string;
}
export const PeersPeerIdPutInput = /*@__PURE__*/ Schema.Struct({
	peerId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	ssh_enabled: Schema.Boolean,
	login_expiration_enabled: Schema.Boolean,
	inactivity_expiration_enabled: Schema.Boolean,
	approval_required: Schema.optional(Schema.Boolean),
	ip: Schema.optional(Schema.String),
	ipv6: Schema.optional(Schema.String),
}).pipe(T.Http({ method: "PUT", path: "/api/peers/{peerId}" })) as unknown as Schema.Codec<PeersPeerIdPutInput>;

// Output Schema
export interface PeersPeerIdPutOutput {
	id: string;
	name: string;
	created_at: string;
	ip: string;
	ipv6?: string;
	connection_ip: string;
	connected: boolean;
	last_seen: string;
	os: string;
	kernel_version: string;
	geoname_id: number;
	version: string;
	groups: ReadonlyArray<{
		id: string;
		name: string;
		peers_count: number;
		resources_count: number;
		issued?: "api" | "integration" | "jwt";
	}>;
	ssh_enabled: boolean;
	user_id: string;
	hostname: string;
	ui_version: string;
	dns_label: string;
	login_expiration_enabled: boolean;
	login_expired: boolean;
	last_login: string;
	inactivity_expiration_enabled: boolean;
	approval_required: boolean;
	disapproval_reason?: string;
	country_code: string;
	city_name: string;
	serial_number: string;
	extra_dns_labels: ReadonlyArray<string>;
	ephemeral: boolean;
	local_flags?: {
		rosenpass_enabled?: boolean;
		rosenpass_permissive?: boolean;
		server_ssh_allowed?: boolean;
		disable_client_routes?: boolean;
		disable_server_routes?: boolean;
		disable_dns?: boolean;
		disable_firewall?: boolean;
		block_lan_access?: boolean;
		block_inbound?: boolean;
		lazy_connection_enabled?: boolean;
	};
}
export const PeersPeerIdPutOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	created_at: Schema.String,
	ip: Schema.String,
	ipv6: Schema.optional(Schema.String),
	connection_ip: Schema.String,
	connected: Schema.Boolean,
	last_seen: Schema.String,
	os: Schema.String,
	kernel_version: Schema.String,
	geoname_id: Schema.Number,
	version: Schema.String,
	groups: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			name: Schema.String,
			peers_count: Schema.Number,
			resources_count: Schema.Number,
			issued: Schema.optional(Schema.Literals(["api", "integration", "jwt"])),
		}),
	),
	ssh_enabled: Schema.Boolean,
	user_id: Schema.String,
	hostname: Schema.String,
	ui_version: Schema.String,
	dns_label: Schema.String,
	login_expiration_enabled: Schema.Boolean,
	login_expired: Schema.Boolean,
	last_login: Schema.String,
	inactivity_expiration_enabled: Schema.Boolean,
	approval_required: Schema.Boolean,
	disapproval_reason: Schema.optional(Schema.String),
	country_code: Schema.String,
	city_name: Schema.String,
	serial_number: Schema.String,
	extra_dns_labels: Schema.Array(Schema.String),
	ephemeral: Schema.Boolean,
	local_flags: Schema.optional(
		Schema.Struct({
			rosenpass_enabled: Schema.optional(Schema.Boolean),
			rosenpass_permissive: Schema.optional(Schema.Boolean),
			server_ssh_allowed: Schema.optional(Schema.Boolean),
			disable_client_routes: Schema.optional(Schema.Boolean),
			disable_server_routes: Schema.optional(Schema.Boolean),
			disable_dns: Schema.optional(Schema.Boolean),
			disable_firewall: Schema.optional(Schema.Boolean),
			block_lan_access: Schema.optional(Schema.Boolean),
			block_inbound: Schema.optional(Schema.Boolean),
			lazy_connection_enabled: Schema.optional(Schema.Boolean),
		}),
	),
}) as unknown as Schema.Codec<PeersPeerIdPutOutput>;

// The operation
/**
 * Update a Peer
 *
 * Update information about a peer
 *
 * @param peerId - The unique identifier of a peer
 */
export const peersPeerIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: PeersPeerIdPutInput,
	outputSchema: PeersPeerIdPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
