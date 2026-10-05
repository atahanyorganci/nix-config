import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Command from "effect/cli/Command";
import * as Flag from "effect/cli/Flag";
import * as Config from "effect/Config";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Catalog from "../src/observability/catalog.ts";
import { PricedModels } from "../src/observability/index.ts";

/**
 * Runs every virtual field and every query of the Axiom catalog against the
 * live dataset, before HomeInfra creates them.
 *
 * Axiom rejects a query that names a field the dataset has not seen, and checks
 * a monitor's query when the monitor is created, so a query that reads a field
 * no record has yet carried fails the deploy. Queries use the virtual fields
 * by name; they do not exist until the deploy, so each is inlined here as an
 * `extend` after every reference to the dataset.
 *
 * Axiom credentials (`AXIOM_TOKEN`, `AXIOM_ORG_ID`) come from the environment,
 * which `doppler run` fills from Doppler.
 */

const repoRoot = Effect.gen(function* () {
	const path = yield* Path.Path;
	return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
});

const nixEval = (expression: string) =>
	Effect.gen(function* () {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		const cwd = yield* repoRoot;
		const stdout = yield* spawner.string(ChildProcess.make("nix", ["eval", "--json", expression], { cwd }));
		return JSON.parse(stdout) as unknown;
	});

const credentials = Config.all({
	token: Config.Redacted("AXIOM_TOKEN"),
	orgId: Config.String("AXIOM_ORG_ID"),
});

const QueryError = Schema.Struct({ message: Schema.String });

/** Runs `apl` over the last `days` days; the error message, if Axiom rejected it. */
const run = (apl: string, days: number) =>
	Effect.gen(function* () {
		const { token, orgId } = yield* credentials;
		const client = yield* HttpClient.HttpClient;
		const now = Date.now();
		const request = HttpClientRequest.post("https://api.axiom.co/v1/datasets/_apl?format=tabular").pipe(
			HttpClientRequest.bearerToken(Redacted.value(token)),
			HttpClientRequest.setHeader("X-AXIOM-ORG-ID", orgId),
			HttpClientRequest.bodyJsonUnsafe({
				apl,
				startTime: new Date(now - days * 86_400_000).toISOString(),
				endTime: new Date(now).toISOString(),
			}),
		);
		const response = yield* client.execute(request);
		if (response.status === 200) return undefined;
		const body = yield* response.json.pipe(Effect.orElseSucceed(() => ({ message: `HTTP ${response.status}` })));
		const decoded = Schema.decodeUnknownOption(QueryError)(body);
		return decoded._tag === "Some" ? decoded.value.message : `HTTP ${response.status}`;
	});

/** `apl` with every virtual field defined after each reference to the dataset. */
const inline = (apl: string, dataset: string, fields: ReadonlyArray<Catalog.VirtualField>) => {
	const extend = fields.map(field => `| extend ${field.name} = ${field.expression}`);
	return apl
		.split("\n")
		.flatMap(line => (line.trim() === `['${dataset}']` ? [line, ...extend.map(e => line.replace(/\S.*/, e))] : [line]))
		.join("\n");
};

const dataset = Flag.String("dataset").pipe(
	Flag.withDescription("Axiom dataset (defaults to .#infra.axiom.dataset)"),
	Flag.optional,
);
const days = Flag.Int("days").pipe(
	Flag.withDescription("How far back the queries look; records older than the dashboards' windows still count"),
	Flag.withDefault(7),
);

const check = Command.make("check-axiom-queries", { dataset, days }).pipe(
	Command.withDescription("Run the Axiom catalog's virtual fields and queries against the live dataset"),
	Command.withHandler(
		Effect.fn(function* (flags) {
			const name =
				flags.dataset._tag === "Some"
					? flags.dataset.value
					: yield* nixEval(".#infra.axiom.dataset").pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.String)));
			const models = yield* nixEval(".#agentGateway.models").pipe(
				Effect.flatMap(Schema.decodeUnknownEffect(PricedModels)),
			);
			const fields = Catalog.virtualFields(models);

			let failures = 0;
			const report = (label: string, error: string | undefined) => {
				if (error !== undefined) failures += 1;
				return Console.log(error === undefined ? `ok\t${label}` : `FAIL\t${label}\n\t${error.replace(/\n/g, "\n\t")}`);
			};

			for (const field of fields) {
				yield* report(
					`field ${field.name}`,
					yield* run(`['${name}'] | extend ${field.name} = ${field.expression} | take 1`, flags.days),
				);
			}
			for (const query of Catalog.queries(name)) {
				yield* report(query.label, yield* run(inline(query.apl, name, fields), flags.days));
			}

			yield* Console.log(failures === 0 ? "every query compiles" : `${failures} failed`);
			if (failures > 0) return yield* Effect.fail(new Error(`${failures} Axiom queries failed`));
		}),
	),
);

const program = Command.run(check, { version: "0.0.0" }).pipe(
	Effect.provide(FetchHttpClient.layer),
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
);

NodeRuntime.runMain(program as Effect.Effect<void>);
