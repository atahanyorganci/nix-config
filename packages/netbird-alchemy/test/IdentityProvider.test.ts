import { identityProvidersGet, identityProvidersPost } from "@yorganci/netbird-api/identity_providers";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import { expect } from "vitest";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-IdentityProvider");

// NetBird fetches the issuer's discovery document on create and update, from
// inside the fixture container, so the issuer has to be a real one. Google's
// is public and needs no client of ours to answer discovery.
const ISSUER = "https://accounts.google.com";
const isIssuerReachable = await fetch(`${ISSUER}/.well-known/openid-configuration`, {
	signal: AbortSignal.timeout(5_000),
})
	.then(response => response.ok)
	.catch(() => false);

const NAME_BASIC = "alchemy-test-idp-basic";
const NAME_ADOPT = "alchemy-test-idp-adopt";

test.provider.skipIf(!isDockerReady || !isIssuerReachable)("create, update, and delete an identity provider", stack =>
	Effect.gen(function* () {
		const server = yield* fixture;
		yield* stack.destroy();

		const idp = yield* stack.deploy(
			NetBird.IdentityProvider("BasicIdp", {
				name: NAME_BASIC,
				issuer: ISSUER,
				clientId: "alchemy-test-client",
				clientSecret: Redacted.make("first-secret"),
			}),
		);

		expect(idp.idpId).toBeDefined();
		expect(idp.type).toEqual("oidc");
		expect(idp.name).toEqual(NAME_BASIC);
		expect(idp.issuer).toEqual(ISSUER);
		expect(idp.clientId).toEqual("alchemy-test-client");
		expect(idp.redirectUrl).toEqual(`${server.baseUrl}/oauth2/callback`);
		expect(idp.logoutUrl).toEqual(`${server.baseUrl}/oauth2/logout/callback`);

		const listed = yield* identityProvidersGet({});
		expect(listed.find(p => p.id === idp.idpId)?.name).toEqual(NAME_BASIC);

		// Name and secret in one update; the secret is only observable through
		// the PUT succeeding, since NetBird never returns it.
		const updated = yield* stack.deploy(
			NetBird.IdentityProvider("BasicIdp", {
				name: `${NAME_BASIC}-renamed`,
				issuer: ISSUER,
				clientId: "alchemy-test-client",
				clientSecret: Redacted.make("second-secret"),
			}),
		);
		expect(updated.idpId).toEqual(idp.idpId);
		expect(updated.name).toEqual(`${NAME_BASIC}-renamed`);

		const live = (yield* identityProvidersGet({})).find(p => p.id === idp.idpId);
		expect(live?.name).toEqual(`${NAME_BASIC}-renamed`);

		yield* stack.destroy();

		const afterDestroy = yield* identityProvidersGet({});
		expect(afterDestroy.find(p => p.id === idp.idpId)).toBeUndefined();
	}).pipe(withLogLevel),
);

test.provider.skipIf(!isDockerReady || !isIssuerReachable)("adopt a provider of the same name and type", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		// As if added in the dashboard before the stack managed it.
		const existing = yield* identityProvidersPost({
			type: "oidc",
			name: NAME_ADOPT,
			issuer: ISSUER,
			client_id: "alchemy-test-client",
			client_secret: Redacted.make("dashboard-secret"),
		});

		const adopted = yield* stack.deploy(
			NetBird.IdentityProvider("AdoptedIdp", {
				name: NAME_ADOPT,
				issuer: ISSUER,
				clientId: "alchemy-test-client",
				clientSecret: Redacted.make("stack-secret"),
			}),
		);
		expect(adopted.idpId).toEqual(existing.id);

		const matching = (yield* identityProvidersGet({})).filter(p => p.name === NAME_ADOPT);
		expect(matching).toHaveLength(1);

		yield* stack.destroy();

		const afterDestroy = yield* identityProvidersGet({});
		expect(afterDestroy.find(p => p.id === existing.id)).toBeUndefined();
	}).pipe(withLogLevel),
);
