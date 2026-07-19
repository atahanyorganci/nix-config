import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface RoutesPostInput {
	description: string;
	network_id: string;
	enabled: boolean;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	network?: string;
	domains?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	groups: ReadonlyArray<string>;
	keep_route: boolean;
	access_control_groups?: ReadonlyArray<string>;
	skip_auto_apply?: boolean;
}
export const RoutesPostInput = /*@__PURE__*/ Schema.Struct({
	description: Schema.String,
	network_id: Schema.String,
	enabled: Schema.Boolean,
	peer: Schema.optional(Schema.String),
	peer_groups: Schema.optional(Schema.Array(Schema.String)),
	network: Schema.optional(Schema.String),
	domains: Schema.optional(Schema.Array(Schema.String)),
	metric: Schema.Number,
	masquerade: Schema.Boolean,
	groups: Schema.Array(Schema.String),
	keep_route: Schema.Boolean,
	access_control_groups: Schema.optional(Schema.Array(Schema.String)),
	skip_auto_apply: Schema.optional(Schema.Boolean),
}).pipe(T.Http({ method: "POST", path: "/api/routes" })) as unknown as Schema.Codec<RoutesPostInput>;

// Output Schema
export interface RoutesPostOutput {
	id: string;
	network_type: string;
	description: string;
	network_id: string;
	enabled: boolean;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	network?: string;
	domains?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	groups: ReadonlyArray<string>;
	keep_route: boolean;
	access_control_groups?: ReadonlyArray<string>;
	skip_auto_apply?: boolean;
}
export const RoutesPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	network_type: Schema.String,
	description: Schema.String,
	network_id: Schema.String,
	enabled: Schema.Boolean,
	peer: Schema.optional(Schema.String),
	peer_groups: Schema.optional(Schema.Array(Schema.String)),
	network: Schema.optional(Schema.String),
	domains: Schema.optional(Schema.Array(Schema.String)),
	metric: Schema.Number,
	masquerade: Schema.Boolean,
	groups: Schema.Array(Schema.String),
	keep_route: Schema.Boolean,
	access_control_groups: Schema.optional(Schema.Array(Schema.String)),
	skip_auto_apply: Schema.optional(Schema.Boolean),
}) as unknown as Schema.Codec<RoutesPostOutput>;

// The operation
/**
 * Create a Route
 *
 * Creates a Route
 */
export const routesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: RoutesPostInput,
	outputSchema: RoutesPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
