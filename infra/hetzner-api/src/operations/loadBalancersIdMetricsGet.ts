import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdMetricsGetInput {
	id: number;
	type: ReadonlyArray<"open_connections" | "connections_per_second" | "requests_per_second" | "bandwidth">;
	start: string;
	end: string;
	step?: string;
}
export const LoadBalancersIdMetricsGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	type: Schema.Array(
		Schema.Literals(["open_connections", "connections_per_second", "requests_per_second", "bandwidth"]),
	),
	start: Schema.String,
	end: Schema.String,
	step: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "GET", path: "/load_balancers/{id}/metrics" }),
) as unknown as Schema.Codec<LoadBalancersIdMetricsGetInput>;

// Output Schema
export interface LoadBalancersIdMetricsGetOutput {
	metrics: {
		start: string;
		end: string;
		step: number;
		time_series: Record<string, { values: ReadonlyArray<ReadonlyArray<unknown>> }>;
	};
}
export const LoadBalancersIdMetricsGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdMetricsGetOutput>;

// The operation
/**
 * Get Metrics for a LoadBalancer
 *
 * You must specify the type of metric to get: `open_connections`, `connections_per_second`, `requests_per_second` or `bandwidth`. You can also specify more than one type by comma separation, e.g. `requests_per_second,bandwidth`.
 * Depending on the type you will get different time series data:
 * Metrics are available for the last 30 days only.
 * If you do not provide the step argument we will automatically adjust it so that 200 samples are returned.
 * We limit the number of samples to a maximum of 500 and will adjust the step parameter accordingly.
 *
 * @param id - ID of the Load Balancer.
 * @param type - Type of metrics to get.
 * @param start - Start of period to get Metrics for (must be in [RFC3339](https://datatracker.ietf.org/doc/html/rfc3339#section-5.6) format).
 * @param end - End of period to get Metrics for (must be in [RFC3339](https://datatracker.ietf.org/doc/html/rfc3339#section-5.6) format).
 * @param step - Resolution of results in seconds.
 */
export const loadBalancersIdMetricsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdMetricsGetInput,
	outputSchema: LoadBalancersIdMetricsGetOutput,
}));
