import { isOutput, type Output } from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaParser from "effect/SchemaParser";
import type { ReverseProxyAuth, ReverseProxyServiceProps, ReverseProxyTarget } from "@yorganci/netbird-alchemy";

const AuthType = Schema.Union([
	Schema.Literal("none"),
	Schema.Literal("bearer"),
	Schema.Literal("link"),
	Schema.Literal("password"),
	Schema.Literal("pin"),
	Schema.Literal("header"),
]);

const Auth = Schema.Struct({
	type: AuthType,
	distributionGroups: Schema.Array(Schema.String),
	passwordFile: Schema.NullOr(Schema.String),
	pin: Schema.NullOr(Schema.String),
	headers: Schema.Array(
		Schema.Struct({
			header: Schema.String,
			value: Schema.String,
		}),
	),
});

type Auth = typeof Auth.Type;

const TargetProtocol = Schema.Union([Schema.Literal("http"), Schema.Literal("https")]);

type TargetProtocol = typeof TargetProtocol.Type;

export const HttpService = Schema.Struct({
	port: Schema.Number,
	protocol: TargetProtocol,
	expose: Schema.Struct({
		enable: Schema.Boolean,
		private: Schema.Boolean,
		accessGroups: Schema.Array(Schema.String),
	}),
	auth: Auth,
});
export type HttpService = typeof HttpService.Type;

export const HttpHost = Schema.Struct({
	name: Schema.String,
	system: Schema.String,
	services: Schema.Record(Schema.String, HttpService),
});
export type HttpHost = typeof HttpHost.Type;

export const HttpServices = Schema.Record(Schema.String, HttpHost);
export type HttpServices = typeof HttpServices.Type;

const ServicePlan = Schema.Struct({
	hostKey: Schema.String,
	serviceKey: Schema.String,
	domain: Schema.String,
	cfg: HttpService,
});

type ServicePlan = typeof ServicePlan.Type;

const PeerId = Schema.Union([Schema.String, Schema.declare((u): u is Output<string> => isOutput(u))]);

/** Opaque target schema so Encoded === Type for one-way `decodeTo` transforms. */
const ReverseProxyAuthSchema = Schema.declare((u): u is ReverseProxyAuth => typeof u === "object" && u !== null);

const readPasswordFile = (path: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const password = yield* fs.readFileString(path, "utf8");
		return password.trim();
	}).pipe(
		Effect.catch(cause =>
			Effect.fail(
				new SchemaIssue.InvalidValue(Option.some(path), {
					message: `failed to read password file ${path}: ${String(cause)}`,
				}),
			),
		),
	);

const encodeForbidden = <T, E>(message: string) => SchemaGetter.forbidden<T, E>(() => message);

const ReverseProxyAuthFromAuth = Auth.pipe(
	Schema.decodeTo(Schema.UndefinedOr(ReverseProxyAuthSchema), {
		decode: SchemaGetter.transformOrFail(auth =>
			Effect.gen(function* () {
				switch (auth.type) {
					case "none":
						return undefined;
					case "bearer":
						return {
							bearerAuth: {
								enabled: true,
								distributionGroups: auth.distributionGroups,
							},
						} satisfies ReverseProxyAuth;
					case "link":
						return { linkAuth: { enabled: true } } satisfies ReverseProxyAuth;
					case "password": {
						if (auth.passwordFile === null) {
							return yield* Effect.fail(
								new SchemaIssue.InvalidValue(Option.some(auth), {
									message: "password auth requires passwordFile",
								}),
							);
						}
						const password = yield* readPasswordFile(auth.passwordFile);
						return {
							passwordAuth: {
								enabled: true,
								password: Redacted.make(password),
							},
						} satisfies ReverseProxyAuth;
					}
					case "pin":
						if (auth.pin === null) {
							return yield* Effect.fail(
								new SchemaIssue.InvalidValue(Option.some(auth), {
									message: "pin auth requires pin",
								}),
							);
						}
						return {
							pinAuth: {
								enabled: true,
								pin: auth.pin,
							},
						} satisfies ReverseProxyAuth;
					case "header":
						return {
							headerAuths: auth.headers.map(entry => ({
								enabled: true,
								header: entry.header,
								value: entry.value,
							})),
						} satisfies ReverseProxyAuth;
				}
			}),
		),
		encode: encodeForbidden("ReverseProxyAuth → Auth encoding is not supported"),
	}),
);

export const ServicePlansFromHttpServices = Schema.Struct({
	httpServices: HttpServices,
	domain: Schema.String,
}).pipe(
	Schema.decodeTo(Schema.Array(ServicePlan), {
		decode: SchemaGetter.transformOrFail(({ httpServices, domain }) => {
			const plans: Array<ServicePlan> = [];
			const serviceHosts = new Map<string, string>();

			for (const [hostKey, host] of Object.entries(httpServices) as Array<[string, HttpHost]>) {
				for (const [serviceKey, cfg] of Object.entries(host.services)) {
					if (!cfg.expose.enable) {
						continue;
					}

					const existingHost = serviceHosts.get(serviceKey);
					if (existingHost !== undefined) {
						return Effect.fail(
							new SchemaIssue.InvalidValue(Option.some({ httpServices, domain }), {
								message: `duplicate exposed service "${serviceKey}" on hosts "${existingHost}" and "${hostKey}" — use unique service keys across the fleet`,
							}),
						);
					}
					serviceHosts.set(serviceKey, hostKey);

					plans.push({
						hostKey,
						serviceKey,
						domain: `${serviceKey}.${domain}`,
						cfg,
					});
				}
			}

			return Effect.succeed(plans);
		}),
		encode: encodeForbidden("ServicePlan[] → HttpServices encoding is not supported"),
	}),
);

type ReverseProxyServiceInput = Omit<ReverseProxyServiceProps, "targets"> & {
	targets: ReadonlyArray<Omit<ReverseProxyTarget, "targetId"> & { targetId: string | Output<string> }>;
};

const ReverseProxyServiceInputSchema = Schema.declare(
	(u): u is ReverseProxyServiceInput => typeof u === "object" && u !== null,
);

const ReverseProxyServicePropsInput = Schema.Struct({
	plan: ServicePlan,
	defaultAccessGroup: Schema.String,
	peerId: PeerId,
});

type ReverseProxyServicePropsInput = typeof ReverseProxyServicePropsInput.Type;

export const ReverseProxyServicePropsFromPlan = ReverseProxyServicePropsInput.pipe(
	Schema.decodeTo(ReverseProxyServiceInputSchema, {
		decode: SchemaGetter.transformOrFail(({ plan, defaultAccessGroup, peerId }) =>
			Effect.gen(function* () {
				const accessGroups =
					plan.cfg.expose.accessGroups.length > 0
						? [...plan.cfg.expose.accessGroups]
						: plan.cfg.expose.private
							? [defaultAccessGroup]
							: undefined;

				const auth = yield* SchemaParser.decodeEffect(ReverseProxyAuthFromAuth)(plan.cfg.auth);

				const props: ReverseProxyServiceInput = {
					name: plan.serviceKey,
					domain: plan.domain,
					enabled: true,
					passHostHeader: true,
					private: plan.cfg.expose.private,
					targets: [
						{
							targetId: peerId,
							targetType: "peer",
							protocol: plan.cfg.protocol,
							port: plan.cfg.port,
							enabled: true,
						},
					],
				};

				if (accessGroups !== undefined) {
					props.accessGroups = accessGroups;
				}
				if (auth !== undefined) {
					props.auth = auth;
				}

				return props;
			}),
		),
		encode: encodeForbidden("ReverseProxyServiceInput → plan encoding is not supported"),
	}),
);
