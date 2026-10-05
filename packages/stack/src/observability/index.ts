/**
 * The Axiom side of the home infrastructure's telemetry.
 *
 * Every host's `otel-collector` (`modules/nixos/otel-collector.nix`) ships
 * OpenTelemetry logs and traces to one dataset, authenticated with an
 * ingest-only token. The token and the dataset's OTLP endpoint are outputs of
 * the HomeInfra stack; `scripts/connect-axiom.ts` writes them to nix-secrets,
 * where sops-nix installs them on a host.
 *
 * One `axiom:events:v1` dataset holds both signals: Axiom's Personal plan
 * allows three datasets, and two belong to another project. Events datasets
 * take OTLP logs and traces alike, telling them apart by shape (a span has a
 * `duration`).
 */
import * as Axiom from "alchemy/Axiom";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** `.#infra.axiom` (`modules/flake/meta.nix`). */
export const AxiomInfra = Schema.Struct({
	dataset: Schema.String,
});
export type AxiomInfra = typeof AxiomInfra.Type;

export const DATASET_DESCRIPTION =
	"OpenTelemetry logs and traces from the home infrastructure, shipped by otel-collector.";

export interface Options {
	readonly infra: AxiomInfra;
}

/**
 * The dataset and the token hosts ingest with.
 *
 * The token can create events in this dataset and do nothing else. Axiom has
 * no way to update a token, so changing its props replaces it, and every host
 * holding the old one is rejected until its secret is rewritten
 * (`just connect-axiom <host>`) and the host redeployed.
 */
export const deploy = Effect.fn(function* (options: Options) {
	const dataset = yield* Axiom.Dataset("OtelDataset", {
		name: options.infra.dataset,
		kind: "axiom:events:v1",
		description: DATASET_DESCRIPTION,
	});

	const ingest = yield* Axiom.ApiToken(
		"OtelIngest",
		Output.map(dataset.name, name => ({
			name: "otel-ingest",
			description: `Ingest-only token for the otel-collector on home infrastructure hosts (dataset ${name}).`,
			datasetCapabilities: { [name]: { ingest: ["create"] } },
		})),
	);

	return {
		endpoint: dataset.otelEndpoint,
		token: ingest.token,
		dataset: dataset.name,
	};
});
