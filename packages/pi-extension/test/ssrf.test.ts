import { describe, expect, it } from "vitest";
import { BlockedUrlError, fetchRemoteUrl, parseAllowRanges, validateRemoteUrl } from "../src/fetch-content/ssrf.ts";

/** Resolve every hostname to fixed addresses, so no test touches real DNS. */
const lookupAs =
	(...addresses: string[]) =>
	async () =>
		addresses.map(address => ({ address }));

const validate = (url: string, addresses: string[], allowRanges?: string[]) =>
	validateRemoteUrl(url, { lookup: lookupAs(...addresses), ...(allowRanges ? { allowRanges } : {}) });

describe("validateRemoteUrl", () => {
	it("allows a public address", async () => {
		await expect(validate("https://example.com/a", ["93.184.216.34"])).resolves.toMatchObject({
			hostname: "example.com",
		});
	});

	it.each([
		["protocol", "file:///etc/passwd", "Only HTTP and HTTPS"],
		["localhost", "http://localhost:8080", "Blocked internal hostname"],
		["subdomain of localhost", "http://api.localhost", "Blocked internal hostname"],
	])("rejects %s", async (_label, url, message) => {
		await expect(validate(url, ["93.184.216.34"])).rejects.toThrow(message);
	});

	// One case per branch of the IPv4 blocklist.
	it.each([
		["this-network", "0.0.0.0"],
		["RFC 1918 /8", "10.0.0.1"],
		["loopback", "127.0.0.1"],
		["carrier-grade NAT", "100.64.0.1"],
		["link-local (cloud metadata)", "169.254.169.254"],
		["RFC 1918 /12", "172.16.0.1"],
		["RFC 1918 /16", "192.168.1.1"],
		["fake-IP proxy range", "198.18.0.1"],
		["multicast", "224.0.0.1"],
	])("blocks IPv4 %s", async (_label, address) => {
		await expect(validate("https://evil.test", [address])).rejects.toThrow(BlockedUrlError);
	});

	it.each([
		["unspecified", "::"],
		["loopback", "::1"],
		["unique local", "fd00::1"],
		["link-local", "fe80::1"],
	])("blocks IPv6 %s", async (_label, address) => {
		await expect(validate("https://evil.test", [address])).rejects.toThrow(BlockedUrlError);
	});

	// The classic bypass: a v6 literal that reaches a v4 private host.
	it.each(["::ffff:10.0.0.1", "::ffff:127.0.0.1", "::ffff:169.254.169.254"])(
		"blocks IPv4-mapped IPv6 %s",
		async address => {
			await expect(validate("https://evil.test", [address])).rejects.toThrow("Blocked internal address");
		},
	);

	it("blocks a literal IP without resolving it", async () => {
		const lookup = () => {
			throw new Error("lookup must not run for a literal IP");
		};
		await expect(validateRemoteUrl("http://169.254.169.254/latest/meta-data", { lookup })).rejects.toThrow(
			"Blocked internal address",
		);
	});

	it("blocks when only one of several addresses is private", async () => {
		// A public answer must not vouch for a private one returned alongside it.
		await expect(validate("https://split.test", ["93.184.216.34", "10.0.0.1"])).rejects.toThrow(
			"Blocked internal address",
		);
	});

	it("reports resolution failure", async () => {
		const lookup = () => Promise.reject(new Error("ENOTFOUND"));
		await expect(validateRemoteUrl("https://nx.test", { lookup })).rejects.toThrow("Failed to resolve nx.test");
	});

	it("rejects an empty address list", async () => {
		await expect(validate("https://empty.test", [])).rejects.toThrow("no addresses returned");
	});

	it.each([
		["trailing dot", "https://example.com./x"],
		["uppercase", "https://EXAMPLE.COM/x"],
	])("normalises hostname with %s", async (_label, url) => {
		// Both spellings must reach the same blocklist decision as the plain name.
		await expect(validate(url, ["10.0.0.1"])).rejects.toThrow("Blocked internal address");
	});
});

describe("allowRanges", () => {
	it("permits an address inside an allowed CIDR", async () => {
		await expect(validate("https://mesh.test", ["100.64.0.5"], ["100.64.0.0/10"])).resolves.toBeInstanceOf(URL);
	});

	it("still blocks an address outside it", async () => {
		await expect(validate("https://mesh.test", ["10.0.0.5"], ["100.64.0.0/10"])).rejects.toThrow(
			"Blocked internal address",
		);
	});

	it("does not match an IPv4 address against an IPv6 rule", async () => {
		await expect(validate("https://mesh.test", ["10.0.0.5"], ["fd00::/8"])).rejects.toThrow("Blocked internal address");
	});

	it("honours a bare host entry", async () => {
		await expect(validate("https://mesh.test", ["10.1.2.3"], ["10.1.2.3"])).resolves.toBeInstanceOf(URL);
	});

	it.each(["10.0.0.0/", "10.0.0.0/abc", "10.0.0.0/33", "not-an-ip", "10.0.0.0/0"])(
		"rejects malformed CIDR %s",
		entry => {
			// "/0" is rejected deliberately: it would exempt the whole address space.
			expect(() => parseAllowRanges([entry])).toThrow("Invalid CIDR notation");
		},
	);
});

describe("fetchRemoteUrl", () => {
	const ok = () => new Response("body", { status: 200, headers: { "content-type": "text/html" } });
	const redirect = (to: string, status = 302) => new Response(null, { status, headers: { location: to } });

	it("returns a non-redirect response unchanged", async () => {
		const response = await fetchRemoteUrl(
			"https://example.com",
			{},
			{
				lookup: lookupAs("93.184.216.34"),
				fetch: async () => ok(),
			},
		);
		expect(response.status).toBe(200);
	});

	it("re-validates each redirect hop", async () => {
		// The payoff for manual redirect handling: a public URL that bounces to
		// cloud metadata must fail on the second hop.
		const fetchImpl = async (input: URL) =>
			String(input).includes("example.com") ? redirect("http://169.254.169.254/latest/meta-data") : ok();

		await expect(
			fetchRemoteUrl("https://example.com", {}, { lookup: lookupAs("93.184.216.34"), fetch: fetchImpl }),
		).rejects.toThrow("Blocked internal address");
	});

	it("never follows a redirect automatically", async () => {
		let sawManual = false;
		await fetchRemoteUrl(
			"https://example.com",
			{},
			{
				lookup: lookupAs("93.184.216.34"),
				fetch: async (_input: URL, init?: RequestInit) => {
					sawManual = init?.redirect === "manual";
					return ok();
				},
			},
		);
		expect(sawManual).toBe(true);
	});

	it("stops after the redirect limit", async () => {
		const fetchImpl = async () => redirect("https://example.com/next");
		await expect(
			fetchRemoteUrl(
				"https://example.com",
				{},
				{
					lookup: lookupAs("93.184.216.34"),
					fetch: fetchImpl,
					maxRedirects: 2,
				},
			),
		).rejects.toThrow("Too many redirects");
	});

	it("returns a redirect that carries no Location header", async () => {
		const response = await fetchRemoteUrl(
			"https://example.com",
			{},
			{
				lookup: lookupAs("93.184.216.34"),
				fetch: async () => new Response(null, { status: 302 }),
			},
		);
		expect(response.status).toBe(302);
	});

	it("downgrades POST to GET on 303 and drops the body", async () => {
		const methods: (string | undefined)[] = [];
		const fetchImpl = async (input: URL, init?: RequestInit) => {
			methods.push(init?.method);
			return String(input).endsWith("/done") ? ok() : redirect("https://example.com/done", 303);
		};

		await fetchRemoteUrl(
			"https://example.com",
			{ method: "POST", body: "x" },
			{
				lookup: lookupAs("93.184.216.34"),
				fetch: fetchImpl,
			},
		);
		expect(methods).toEqual(["POST", "GET"]);
	});

	it("resolves a relative Location against the current URL", async () => {
		const seen: string[] = [];
		const fetchImpl = async (input: URL) => {
			seen.push(String(input));
			return seen.length === 1 ? redirect("/page-2") : ok();
		};

		await fetchRemoteUrl("https://example.com/a/b", {}, { lookup: lookupAs("93.184.216.34"), fetch: fetchImpl });
		expect(seen[1]).toBe("https://example.com/page-2");
	});
});
