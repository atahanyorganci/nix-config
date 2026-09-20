import { type Policy, throttlingFactory, transientFactory } from "@distilled.cloud/core/retry";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export {
	type Options,
	type Factory,
	type Policy,
	makeDefault,
	jittered,
	capped,
	throttlingOptions,
	transientOptions,
	throttlingFactory,
	transientFactory,
} from "@distilled.cloud/core/retry";

export class Retry extends Context.Service<Retry, Policy>()("NetbirdRetry") {}

export const policy = (optionsOrFactory: Policy) => Effect.provide(Layer.succeed(Retry, optionsOrFactory));

export const none = Effect.provide(Layer.succeed(Retry, { while: () => false }));

export const throttling = policy(throttlingFactory);

export const transient = policy(transientFactory);
