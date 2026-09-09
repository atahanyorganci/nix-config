#!/usr/bin/env bun
/**
 * generate — turn the Smithy JSON models in .generated-specs into the NetBird
 * Effect SDK.
 *
 * Input:  .generated-specs/<tag>.json  (one model per NetBird API tag, written
 *         by scripts/convert.ts)
 * Output: src/services/<tag>.ts + src/services/index.ts
 *
 * The smithy→SDK compiler lives in `@distilled.cloud/core/codegen`; this file
 * is NetBird's provider spec: nullable members, bare-array responses,
 * sensitive strings redacted on the way out, passthrough unions, and the
 * protocol/retry/error names of the hand-written runtime in src/.
 *
 * Wire member names are kept verbatim (snake_case), matching NetBird's docs
 * and dashboard. Module files are named after the tag slug (`setup_keys.ts`)
 * while the barrel exports them camelCased (`Services.setupKeys`).
 */
import { runGeneratorCli } from "@distilled.cloud/core/codegen/cli";
import { ERROR_MATCHERS_TRAIT, NULLABLE_TRAIT, RAW_RESPONSE_TRAIT } from "@distilled.cloud/core/codegen/openapi";
import type { SdkSpec } from "@distilled.cloud/core/codegen/generator";

const SENSITIVE_TRAIT = "smithy.api#sensitive";

/** `setup_keys` → `setupKeys` (the barrel's export name). */
const camel = (slug: string): string =>
	slug
		.split("_")
		.filter(Boolean)
		.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join("");

const spec: SdkSpec = {
	nullableTrait: NULLABLE_TRAIT,
	errorMatchersTrait: ERROR_MATCHERS_TRAIT,

	extraBindings: [
		{
			// Sole member of a synthesized wrapper for bare array/scalar response
			// bodies — as a response's sole member, the response IS the payload.
			trait: RAW_RESPONSE_TRAIT,
			binding: "rawResponse",
			pipe: "T.RawResponse()",
			rootPipe: "T.RawResponseRoot()",
		},
	],

	// Setup keys, personal access tokens and proxy tokens are only returned in
	// full once: Redacted on the way out, `string | Redacted` accepted on the way in.
	memberTraitPipes: {
		[SENSITIVE_TRAIT]: "T.SensitiveValue",
	},
	memberTsType: member =>
		SENSITIVE_TRAIT in member.traits
			? `string | Redacted.Redacted<string>${member.nullable ? " | null" : ""}`
			: undefined,

	// NetBird's `oneOf` unions decode passthrough: the TS type is the case
	// union, the schema stays opaque, and wire names equal the TS names.
	union: ({ name, caseTargets, tsRef }) => [
		`export type ${name} = ${caseTargets.map(tsRef).join(" | ") || "unknown"};`,
		`export const ${name} = /*@__PURE__*/ S.Unknown as any as S.Schema<${name}>;\n`,
	],

	sourceNote: ".generated-specs (spec/netbird.api.json)",

	operationDecl: {
		contextType: "NetbirdOpContext",
		commonErrorType: "NetbirdOpError",
		commonErrorClasses: ["UnknownNetbirdError"],
		protocol: "NetbirdProtocol",
		retry: "Retry.Retry",
	},

	// The consumers of this SDK (Alchemy providers) treat every list as
	// read-only, look up map values without `undefined`, and match enums as
	// closed unions, so the emitted TS surface is normalized to that shape:
	//   - `Array<T>` list aliases become `ReadonlyArray<T>`
	//   - map value types drop the trailing `| undefined`
	//   - open enums (`Enum | (string & {})`) become the closed literal union
	// `effect/Redacted` is only referenced by modules with sensitive members.
	postProcess: code => {
		let out = code
			.replace(/^export type (\w+) = Array<(.+)>;$/gm, "export type $1 = ReadonlyArray<$2>;")
			.replace(/\[key: string\]: ([^;{}]+?) \| undefined(;| \})/g, "[key: string]: $1$2")
			.replace(/ \| \(string & \{\}\)/g, "");
		if (out.includes("Redacted.Redacted<")) {
			out = out.replace(
				`import * as S from "@distilled.cloud/core/schema";`,
				`import * as S from "@distilled.cloud/core/schema";\nimport * as Redacted from "effect/Redacted";`,
			);
		}
		return out;
	},
};

runGeneratorCli({
	description: "Generate the NetBird Effect SDK from the Smithy models",
	root: `${import.meta.dir}/..`,
	// The RFC-6902 patch chain in patches/*.patch.json applies to the OpenAPI
	// document in scripts/convert.ts, never to the Smithy models.
	patchesDir: false,
	barrelExportName: camel,
	spec: () => spec,
});
