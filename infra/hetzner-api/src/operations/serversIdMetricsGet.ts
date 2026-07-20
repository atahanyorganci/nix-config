import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdMetricsGetInput {
	id: number;
	type: ReadonlyArray<"cpu" | "disk" | "network">;
	start: string;
	end: string;
	step?: string;
}
export const ServersIdMetricsGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	type: Schema.Array(Schema.Literals(["cpu", "disk", "network"])),
	start: Schema.String,
	end: Schema.String,
	step: Schema.optional(Schema.String),
}).pipe(T.Http({ method: "GET", path: "/servers/{id}/metrics" })) as unknown as Schema.Codec<ServersIdMetricsGetInput>;

// Output Schema
export interface ServersIdMetricsGetOutput {
	metrics: {
		start: string;
		end: string;
		step: number;
		time_series: Record<string, { values: ReadonlyArray<ReadonlyArray<unknown>> }>;
	};
}
export const ServersIdMetricsGetOutput = /*@__PURE__*/ Schema.Struct({
	metrics: Schema.Struct({
		start: Schema.String,
		end: Schema.String,
		step: Schema.Number,
		time_series: Schema.Record(
			Schema.String,
			Schema.Struct({
				values: Schema.Array(Schema.Array(Schema.Unknown)),
			}),
		),
	}),
}) as unknown as Schema.Codec<ServersIdMetricsGetOutput>;

// The operation
/**
 * Get Metrics for a Server
 *
 * Get Metrics for specified Server.
 * You must specify the type of metric to get: cpu, disk or network. You can also specify more than one type by comma separation, e.g. cpu,disk.
 * Depending on the type you will get different time series data
 * Metrics are available for the last 30 days only.
 * If you do not provide the step argument we will automatically adjust it so that a maximum of 200 samples are returned.
 * We limit the number of samples returned to a maximum of 500 and will adjust the step parameter accordingly.
 *
 * @param id - ID of the Server.
 * @param type - Type of metrics to get.
 * @param start - Start of period to get Metrics for (must be in [RFC3339](https://datatracker.ietf.org/doc/html/rfc3339#section-5.6) format).
 * @param end - End of period to get Metrics for (must be in [RFC3339](https://datatracker.ietf.org/doc/html/rfc3339#section-5.6) format).
 * @param step - Resolution of results in seconds.
 */
export const serversIdMetricsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdMetricsGetInput,
	outputSchema: ServersIdMetricsGetOutput,
}));
