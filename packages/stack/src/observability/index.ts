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
 *
 * On top of it, from `catalog.ts`: virtual fields, saved views, three monitors
 * (the plan's limit) emailing the owner, and two dashboards.
 */
import * as Axiom from "alchemy/Axiom";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as String from "effect/String";
import { ModelCost } from "../agent-network.ts";
import * as Catalog from "./catalog.ts";

/** `.#infra.axiom` (`modules/flake/meta.nix`). */
export const AxiomInfra = Schema.Struct({
	dataset: Schema.String,
});
export type AxiomInfra = typeof AxiomInfra.Type;

/** `.#agentGateway.models`, as far as pricing needs it. */
export const PricedModels = Schema.Array(Schema.Struct({ id: Schema.String, cost: Schema.NullOr(ModelCost) }));

export const DATASET_DESCRIPTION =
	"OpenTelemetry logs and traces from the home infrastructure, shipped by otel-collector.";

export interface Options {
	readonly infra: AxiomInfra;
	/** Where the monitors send their alerts. */
	readonly email: string;
	readonly models: ReadonlyArray<Catalog.PricedModel>;
}

/**
 * The dataset, the token hosts ingest with, and what the dataset is queried
 * with.
 *
 * The token can create events in the dataset and do nothing else. Axiom has
 * no way to update a token, so changing its props replaces it, and every host
 * holding the old one is rejected until its secret is rewritten
 * (`just connect-axiom <host>`) and the host redeployed.
 *
 * Axiom rejects a query naming a field it has not seen, and a monitor's query
 * is checked when the monitor is created. So the views, monitors and
 * dashboards wait for every virtual field, and the dataset has to hold records
 * with the fields they read; `scripts/check-axiom-queries.ts` says whether it
 * does.
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

	const fields: Array<Axiom.VirtualField> = [];
	for (const field of Catalog.virtualFields(options.models)) {
		fields.push(
			yield* Axiom.VirtualField(`Field${String.pascalCase(field.name)}`, {
				dataset: dataset.name,
				name: field.name,
				description: field.description,
				expression: field.expression,
			}),
		);
	}
	// The dataset's name, once every virtual field exists: what the queries are
	// built from, so nothing that queries the dataset is created before them.
	const queryable = Output.all(dataset.name, ...fields.map(field => field.id)).pipe(Output.map(([name]) => name));

	for (const view of Catalog.views(options.infra.dataset)) {
		yield* Axiom.View(
			`View${view.key}`,
			Output.map(queryable, name => ({
				name: view.name,
				description: view.description,
				datasets: [name],
				aplQuery: view.aplQuery,
			})),
		);
	}

	const owner = yield* Axiom.Notifier("OwnerEmail", {
		name: "Owner email",
		properties: { email: { emails: [options.email] } },
	});

	const monitorIds: Record<string, Output.Output<string>> = {};
	for (const monitor of Catalog.monitors(options.infra.dataset)) {
		const resource = yield* Axiom.Monitor(
			`Monitor${monitor.key}`,
			Output.all(queryable, owner.id).pipe(
				Output.map(([, notifierId]) => ({ ...monitor.props, notifierIds: [notifierId] })),
			),
		);
		monitorIds[monitor.props.name] = resource.id;
	}
	const monitorList = Output.all(queryable, ...Object.values(monitorIds));

	const overview = yield* Axiom.Dashboard(
		"AgentGatewayDashboard",
		Output.map(monitorList, ([name, ...ids]) => ({
			uid: "agent-gateway",
			dashboard: Catalog.overview(name, ids),
		})),
	);
	const weekly = yield* Axiom.Dashboard(
		"AgentGatewayWeeklyDashboard",
		Output.map(monitorList, ([name, ...ids]) => ({
			uid: "agent-gateway-weekly",
			dashboard: Catalog.weekly(name, ids),
		})),
	);

	return {
		endpoint: dataset.otelEndpoint,
		token: ingest.token,
		dataset: dataset.name,
		dashboards: { overview: overview.uid, weekly: weekly.uid },
		monitors: monitorIds,
	};
});
