import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PricingGetInput {}
export const PricingGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/pricing" }),
) as unknown as Schema.Codec<PricingGetInput>;

// Output Schema
export interface PricingGetOutput {
	pricing: {
		currency: string;
		vat_rate: string;
		primary_ips: ReadonlyArray<{
			type: "ipv4" | "ipv6";
			prices: ReadonlyArray<{
				location: string;
				price_hourly: { net: string; gross: string };
				price_monthly: { net: string; gross: string };
			}>;
		}>;
		floating_ips: ReadonlyArray<{
			type: "ipv4" | "ipv6";
			prices: ReadonlyArray<{ location: string; price_monthly: { net: string; gross: string } }>;
		}>;
		image: { price_per_gb_month: { net: string; gross: string } };
		volume: { price_per_gb_month: { net: string; gross: string } };
		server_backup: { percentage: string };
		server_types: ReadonlyArray<{
			id: number;
			name: string;
			prices: ReadonlyArray<{
				location: string;
				price_hourly: { net: string; gross: string };
				price_monthly: { net: string; gross: string };
				included_traffic: number;
				price_per_tb_traffic: { net: string; gross: string };
			}>;
		}>;
		load_balancer_types: ReadonlyArray<{
			id: number;
			name: string;
			prices: ReadonlyArray<{
				location: string;
				price_hourly: { net: string; gross: string };
				price_monthly: { net: string; gross: string };
				included_traffic: number;
				price_per_tb_traffic: { net: string; gross: string };
			}>;
		}>;
		floating_ip: { price_monthly: { net: string; gross: string } };
	};
}
export const PricingGetOutput = /*@__PURE__*/ Schema.Struct({
	pricing: Schema.Struct({
		currency: Schema.String,
		vat_rate: Schema.String,
		primary_ips: Schema.Array(
			Schema.Struct({
				type: Schema.Literals(["ipv4", "ipv6"]),
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
					}),
				),
			}),
		),
		floating_ips: Schema.Array(
			Schema.Struct({
				type: Schema.Literals(["ipv4", "ipv6"]),
				prices: Schema.Array(
					Schema.Struct({
						location: Schema.String,
						price_monthly: Schema.Struct({
							net: Schema.String,
							gross: Schema.String,
						}),
					}),
				),
			}),
		),
		image: Schema.Struct({
			price_per_gb_month: Schema.Struct({
				net: Schema.String,
				gross: Schema.String,
			}),
		}),
		volume: Schema.Struct({
			price_per_gb_month: Schema.Struct({
				net: Schema.String,
				gross: Schema.String,
			}),
		}),
		server_backup: Schema.Struct({
			percentage: Schema.String,
		}),
		server_types: Schema.Array(
			Schema.Struct({
				id: Schema.Number,
				name: Schema.String,
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
		),
		load_balancer_types: Schema.Array(
			Schema.Struct({
				id: Schema.Number,
				name: Schema.String,
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
		),
		floating_ip: Schema.Struct({
			price_monthly: Schema.Struct({
				net: Schema.String,
				gross: Schema.String,
			}),
		}),
	}),
}) as unknown as Schema.Codec<PricingGetOutput>;

// The operation
/**
 * Get all prices
 *
 * Returns prices for all resources available on the platform. VAT and currency of the Project owner are used for calculations.
 * Both net and gross prices are included in the response.
 */
export const pricingGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PricingGetInput,
	outputSchema: PricingGetOutput,
}));
