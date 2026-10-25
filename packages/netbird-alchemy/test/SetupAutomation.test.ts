import { eventsAuditGet } from "@yorganci/netbird-api/events";
import { usersGet } from "@yorganci/netbird-api/users";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";
import { expect } from "vitest";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

// A fixture left before setup: `NetBird.Setup` is what sets it up.
const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-Setup", { setup: false });

const props = (baseUrl: string) => ({
	apiBaseUrl: baseUrl,
	email: "admin@example.com",
	name: "admin",
	password: Redacted.make("alchemy-test-password-123"),
	automation: { name: "automation", tokenName: "stack", expiresIn: 7 },
});

test.provider.skipIf(!isDockerReady)(
	"set up the owner, a service user and its key, and delete the setup token",
	stack =>
		Effect.gen(function* () {
			const server = yield* fixture;
			yield* stack.destroy();

			const setup = yield* stack.deploy(NetBird.Setup("Admin", props(server.baseUrl)));
			expect(setup.email).toEqual("admin@example.com");
			// Given, so not kept.
			expect(setup.password).toBeUndefined();
			const automation = setup.automation!;
			expect(automation.name).toEqual("automation");
			expect(automation.tokenName).toEqual("stack");
			expect(Redacted.value(automation.token).length).toBeGreaterThan(0);

			// Everything after setup authenticates with the service user's key.
			const asAutomation = Effect.provideService(
				NetBird.Credentials,
				Effect.succeed({ apiToken: automation.token, managementUrl: server.baseUrl }),
			);
			const users = yield* usersGet({}).pipe(asAutomation);
			expect(users.find(user => user.id === setup.userId)?.role).toEqual("owner");
			const service = users.find(user => user.id === automation.userId);
			expect(service?.is_service_user).toBe(true);
			expect(service?.role).toEqual("admin");

			// The owner's setup token was deleted, by the owner. Its token list is
			// closed to an admin, so the audit log is where that shows.
			const deleted = yield* eventsAuditGet({}).pipe(
				asAutomation,
				Effect.map(events =>
					events.some(
						event => event.activity_code === "personal.access.token.delete" && event.initiator_id === setup.userId,
					),
				),
				Effect.repeat({ schedule: Schedule.spaced("500 millis"), until: found => found, times: 20 }),
			);
			expect(deleted).toBe(true);

			// Setup is done once: a second deploy keeps what the first one made.
			const again = yield* stack.deploy(NetBird.Setup("Admin", props(server.baseUrl)));
			expect(again.userId).toEqual(setup.userId);
			expect(again.automation?.tokenId).toEqual(automation.tokenId);

			yield* stack.destroy();
		}).pipe(withLogLevel),
);
