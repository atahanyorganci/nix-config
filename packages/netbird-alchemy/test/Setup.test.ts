import * as Output from "alchemy/Output";
import * as Redacted from "effect/Redacted";
import { describe, expect, it } from "vitest";
import { diffSetup, setupRequestBody, type SetupAttributes, type SetupProps } from "../src/Setup/Setup.ts";

const output: SetupAttributes = {
	userId: "user-1",
	email: "admin@example.com",
	password: Redacted.make("stored"),
	apiBaseUrl: "https://netbird.example.com",
};

const props: SetupProps = {
	apiBaseUrl: "https://netbird.example.com",
	email: "admin@example.com",
	name: "Admin",
};

describe("diffSetup", () => {
	it("defers to the engine before the first setup", () => {
		expect(diffSetup({ news: props, output: undefined })).toBeUndefined();
	});

	it("ignores an unresolved `ready` edge", () => {
		const news = { ...props, ready: Output.map(Output.literal("hash"), () => true) };
		expect(diffSetup({ news, output })).toEqual({ action: "noop" });
	});

	it("ignores account fields fixed by the first setup", () => {
		const news = {
			...props,
			email: "other@example.com",
			name: "Other",
			password: Redacted.make("rotated"),
		};
		expect(diffSetup({ news, output })).toEqual({ action: "noop" });
	});

	it("ignores a trailing slash on the base URL", () => {
		expect(diffSetup({ news: { ...props, apiBaseUrl: `${props.apiBaseUrl}/` }, output })).toEqual({
			action: "noop",
		});
	});

	it("replaces for a different management server", () => {
		expect(diffSetup({ news: { ...props, apiBaseUrl: "https://other.example.com" }, output })).toEqual({
			action: "replace",
		});
	});

	it("defers to the engine while the base URL is unresolved", () => {
		const news = { ...props, apiBaseUrl: Output.literal(props.apiBaseUrl) };
		expect(diffSetup({ news, output })).toBeUndefined();
	});
});

describe("setupRequestBody", () => {
	const base = { email: "admin@example.com", name: "admin", password: Redacted.make("secret-password") };

	it("asks for no setup token without automation", () => {
		expect(setupRequestBody(base)).toEqual({
			email: "admin@example.com",
			name: "admin",
			password: "secret-password",
		});
	});

	it("asks for a one-day setup token with automation", () => {
		expect(setupRequestBody({ ...base, automation: { name: "automation", tokenName: "stack" } })).toEqual({
			email: "admin@example.com",
			name: "admin",
			password: "secret-password",
			create_pat: true,
			pat_expire_in: 1,
		});
	});
});

describe("diffSetup with automation", () => {
	it("never sets up again for a different service user", () => {
		const news = { ...props, automation: { name: "other", tokenName: "other", expiresIn: 30 } };
		expect(diffSetup({ news, output })).toEqual({ action: "noop" });
	});
});
