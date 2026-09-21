/**
 * Reads pi's shipped `.d.ts` files and turns `interface Settings` into the IR.
 *
 * The `.d.ts` files are the authoritative description of the settings surface:
 * they are generated from the implementation, so they cannot drift from it, and
 * they include properties the prose docs omit (`showTerminalProgress` and
 * `lastChangelogVersion` are both absent from settings.md). The docs are used
 * only for descriptions and stated defaults.
 *
 * Imported via the `typescript-5` alias: the compiler API used here
 * (`ts.ScriptTarget`, `ts.createProgram`) is not present in the TypeScript 7
 * native port that this repo pins for type-checking.
 */
import * as ts from "typescript-5";
import { type NixType, type OptionNode, RUNTIME_STATE_PROPERTIES, type SkippedProperty } from "./model.ts";

export interface ExtractOptions {
	/** Path to `dist/core/settings-manager.d.ts` inside the pi package. */
	settingsManagerDts: string;
	/** Root of the pi package, used to resolve its bundled dependencies. */
	packageRoot: string;
}

/** Type aliases whose resolved shape is too open to model as a closed option. */
const OPAQUE_TYPE_NAMES = new Set(["PackageSource"]);

const createProgram = (entry: string): ts.Program =>
	ts.createProgram([entry], {
		target: ts.ScriptTarget.ESNext,
		module: ts.ModuleKind.ESNext,
		// Bundler resolution is what lets `@earendil-works/pi-tui` and
		// `pi-agent-core` imports resolve out of pi's own node_modules, which is
		// required for cross-package aliases (ThinkingLevel, Transport,
		// ScrollViewScrollbar) to widen into their string-literal unions.
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		skipLibCheck: true,
		noEmit: true,
	});

/** Collapse a union of string literals into the literal values, if it is one. */
const stringLiteralUnion = (type: ts.Type): string[] | undefined => {
	if (!type.isUnion()) {
		return undefined;
	}
	const values: string[] = [];
	for (const member of type.types) {
		if (member.isStringLiteral()) {
			values.push(member.value);
			continue;
		}
		return undefined;
	}
	return values.length > 0 ? values : undefined;
};

/** Collapse a union of numeric literals (e.g. `0 | 1`) into its bounds. */
const numberLiteralUnion = (type: ts.Type): number[] | undefined => {
	if (!type.isUnion()) {
		return undefined;
	}
	const values: number[] = [];
	for (const member of type.types) {
		if (member.isNumberLiteral()) {
			values.push(member.value);
			continue;
		}
		return undefined;
	}
	return values.length > 0 ? values : undefined;
};

const isBooleanLike = (type: ts.Type): boolean =>
	(type.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) !== 0 ||
	(type.isUnion() && type.types.every(member => (member.flags & ts.TypeFlags.BooleanLiteral) !== 0));

export class Extractor {
	private readonly checker: ts.TypeChecker;
	private readonly program: ts.Program;
	readonly diagnostics: readonly ts.Diagnostic[];
	readonly skipped: SkippedProperty[] = [];

	private readonly options: ExtractOptions;

	constructor(options: ExtractOptions) {
		this.options = options;
		this.program = createProgram(options.settingsManagerDts);
		this.checker = this.program.getTypeChecker();
		const source = this.program.getSourceFile(options.settingsManagerDts);
		if (source === undefined) {
			throw new Error(`could not load ${options.settingsManagerDts}`);
		}
		// Surfaced rather than thrown: a diagnostic here means cross-package
		// aliases silently degraded to `any`, which would quietly emit
		// `types.anything` for every enum. The caller decides how loud to be.
		this.diagnostics = this.program.getSemanticDiagnostics(source);
	}

	private get sourceFile(): ts.SourceFile {
		const source = this.program.getSourceFile(this.options.settingsManagerDts);
		if (source === undefined) {
			throw new Error(`could not load ${this.options.settingsManagerDts}`);
		}
		return source;
	}

	/** Find a top-level `interface` or `type` declaration by name. */
	private findDeclaration(name: string): ts.InterfaceDeclaration | undefined {
		for (const statement of this.sourceFile.statements) {
			if (ts.isInterfaceDeclaration(statement) && statement.name.text === name) {
				return statement;
			}
		}
		return undefined;
	}

	/**
	 * Map one TypeScript type onto a Nix type.
	 *
	 * Throws on anything unrecognised. A generator that guesses is worse than
	 * one that stops: silently emitting `types.anything` would produce a module
	 * that accepts invalid settings and reports no error until pi itself fails.
	 */
	private mapType(type: ts.Type, node: ts.TypeNode, path: string): NixType {
		const text = node.getText(this.sourceFile);

		// Deliberately opaque unions (string | object form) stay permissive.
		if (ts.isTypeReferenceNode(node) && OPAQUE_TYPE_NAMES.has(node.typeName.getText(this.sourceFile))) {
			return { kind: "anything" };
		}
		if (ts.isArrayTypeNode(node)) {
			const elementType = this.checker.getTypeAtLocation(node.elementType);
			return { kind: "listOf", of: this.mapType(elementType, node.elementType, `${path}.*`) };
		}

		// `boolean | "auto"` and friends: model as an open union of bool + enum.
		if (type.isUnion()) {
			const literals = stringLiteralUnion(type);
			if (literals !== undefined) {
				return { kind: "enum", values: literals };
			}
			const numbers = numberLiteralUnion(type);
			if (numbers !== undefined) {
				const lo = Math.min(...numbers);
				const hi = Math.max(...numbers);
				return { kind: "intBetween", lo, hi };
			}
			// Mixed unions: split booleans from string literals and rejoin.
			const booleanMembers = type.types.filter(member => (member.flags & ts.TypeFlags.BooleanLiteral) !== 0);
			const stringMembers = type.types.filter(member => member.isStringLiteral());
			const others = type.types.filter(
				member => (member.flags & ts.TypeFlags.BooleanLiteral) === 0 && !member.isStringLiteral(),
			);
			if (others.length === 0 && booleanMembers.length > 0 && stringMembers.length > 0) {
				const enumValues = stringMembers.flatMap(member => (member.isStringLiteral() ? [member.value] : []));
				return { kind: "oneOf", of: [{ kind: "bool" }, { kind: "enum", values: enumValues }] };
			}
		}

		if (isBooleanLike(type)) {
			return { kind: "bool" };
		}
		if ((type.flags & ts.TypeFlags.String) !== 0) {
			return { kind: "str" };
		}
		if ((type.flags & ts.TypeFlags.Number) !== 0) {
			return { kind: "number" };
		}

		// `Record<string, X>` / index signatures become attribute sets.
		const stringIndex = type.getStringIndexType();
		if (stringIndex !== undefined) {
			const literals = stringLiteralUnion(stringIndex);
			const valueType: NixType =
				literals !== undefined
					? { kind: "enum", values: literals }
					: (stringIndex.flags & ts.TypeFlags.String) !== 0
						? { kind: "str" }
						: (stringIndex.flags & ts.TypeFlags.Number) !== 0
							? { kind: "number" }
							: { kind: "anything" };
			return { kind: "attrsOf", of: valueType };
		}

		// A named interface: recurse into a submodule.
		if (ts.isTypeReferenceNode(node)) {
			const name = node.typeName.getText(this.sourceFile);
			const declaration = this.findDeclaration(name);
			if (declaration !== undefined) {
				return { kind: "submodule", options: this.extractInterface(declaration, path) };
			}
		}

		throw new Error(
			`unmapped type at "${path}": ${text} (resolved: ${this.checker.typeToString(type)}).\n` +
				`Add a mapping in extract.ts rather than letting it degrade to types.anything.`,
		);
	}

	/** Walk an interface's properties into option nodes. */
	extractInterface(declaration: ts.InterfaceDeclaration, prefix = ""): OptionNode[] {
		const nodes: OptionNode[] = [];
		for (const member of declaration.members) {
			if (!ts.isPropertySignature(member) || member.type === undefined) {
				continue;
			}
			const name = member.name.getText(this.sourceFile).replace(/^"|"$/g, "");
			const path = prefix === "" ? name : `${prefix}.${name}`;

			const runtimeState = prefix === "" ? RUNTIME_STATE_PROPERTIES[name] : undefined;
			if (runtimeState !== undefined) {
				this.skipped.push({ path, reason: runtimeState.reason, note: runtimeState.note });
				continue;
			}

			const type = this.checker.getTypeAtLocation(member.type);
			nodes.push({ name, path, type: this.mapType(type, member.type, path) });
		}
		return nodes;
	}

	/** Extract the root `Settings` interface. */
	extractSettings(): OptionNode[] {
		const declaration = this.findDeclaration("Settings");
		if (declaration === undefined) {
			throw new Error("interface Settings not found — pi's settings-manager.d.ts layout changed");
		}
		return this.extractInterface(declaration);
	}

	/** Collect keybinding action ids from an interface of literal keys. */
	static keybindingIds(dtsPath: string, interfaceName: string): string[] {
		const program = createProgram(dtsPath);
		const checker = program.getTypeChecker();
		const source = program.getSourceFile(dtsPath);
		if (source === undefined) {
			throw new Error(`could not load ${dtsPath}`);
		}
		for (const statement of source.statements) {
			if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== interfaceName) {
				continue;
			}
			const type = checker.getTypeAtLocation(statement.name);
			return checker
				.getPropertiesOfType(type)
				.map(property => property.name)
				.filter(name => name.includes("."));
		}
		throw new Error(`interface ${interfaceName} not found in ${dtsPath}`);
	}
}
