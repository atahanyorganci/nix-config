import { createServer } from "node:http";
import { afterAll, describe, expect, it } from "vitest";
import { extractContent } from "../src/fetch-content/extract.ts";
import type { AddressInfo } from "node:net";

/**
 * Serve fixed bytes from loopback so encoding and content-type handling can be
 * exercised without reaching the network. The SSRF guard blocks loopback by
 * default, so every call opts in through allowRanges.
 */
const servers: ReturnType<typeof createServer>[] = [];

function serve(contentType: string, body: Buffer | string): Promise<string> {
	return new Promise(resolve => {
		const server = createServer((_request, response) => {
			response.setHeader("content-type", contentType);
			response.end(body);
		});
		servers.push(server);
		server.listen(0, "127.0.0.1", () => {
			resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}/doc.txt`);
		});
	});
}

const fetchBody = async (contentType: string, body: Buffer | string) =>
	await extractContent(await serve(contentType, body), { allowRanges: ["127.0.0.0/8"] });

afterAll(() => {
	for (const server of servers) server.close();
});

// "Café - naïve résumé" encoded as latin-1, which is mojibake read as UTF-8.
const LATIN1 = Buffer.from([
	0x43, 0x61, 0x66, 0xe9, 0x20, 0x2d, 0x20, 0x6e, 0x61, 0xef, 0x76, 0x65, 0x20, 0x72, 0xe9, 0x73, 0x75, 0x6d, 0xe9,
]);

describe("character encoding", () => {
	it("honours a declared non-UTF-8 charset", async () => {
		const result = await fetchBody("text/plain; charset=iso-8859-1", LATIN1);
		expect(result.content).toBe("Café - naïve résumé");
	});

	it("decodes HTML with a declared charset", async () => {
		const html = Buffer.concat([
			Buffer.from("<html><head><title>T</title></head><body><article><p>", "latin1"),
			LATIN1,
			Buffer.from("</p></article></body></html>", "latin1"),
		]);
		const result = await fetchBody("text/html; charset=iso-8859-1", html);
		expect(result.content).toContain("Café");
	});

	it("defaults to UTF-8 when no charset is declared", async () => {
		const result = await fetchBody("text/plain", "Café — naïve");
		expect(result.content).toBe("Café — naïve");
	});

	it("falls back to UTF-8 for an unknown charset label", async () => {
		// TextDecoder throws on labels it does not implement; the fetch must not
		// fail because a server advertised something obscure.
		const result = await fetchBody("text/plain; charset=x-not-a-real-charset", "fallback ok");
		expect(result.content).toBe("fallback ok");
	});
});

describe("content types", () => {
	it("passes plain text through unchanged", async () => {
		// Plain text is already the content: handing it to the HTML extractor
		// returns nothing, and on input with no markup it throws.
		const body = "RFC 9110\n\nThis document describes HTTP semantics.";
		const result = await fetchBody("text/plain", body);
		expect(result.error).toBeNull();
		expect(result.content).toBe(body);
	});

	it("passes markdown through without treating it as markup", async () => {
		const body = "# Nix\n\nNix is a package manager.";
		const result = await fetchBody("text/markdown", body);
		expect(result.error).toBeNull();
		expect(result.content).toBe(body);
	});

	it("titles plain text from a leading markdown heading", async () => {
		const result = await fetchBody("text/markdown", "# Project Title\n\nBody text.");
		expect(result.title).toBe("Project Title");
	});

	it("falls back to the URL's file name when the text has no heading", async () => {
		const result = await fetchBody("text/plain", "No heading here.");
		expect(result.title).toBe("doc.txt");
	});

	it("extracts readable content from HTML", async () => {
		const body = `<html><head><title>Doc</title></head><body><article><h1>Heading</h1>${"<p>Body paragraph with enough text to look like an article.</p>".repeat(
			10,
		)}</article></body></html>`;
		const result = await fetchBody("text/html", body);
		expect(result.error).toBeNull();
		expect(result.content).toContain("Body paragraph");
	});

	it("rejects binary content types", async () => {
		const result = await fetchBody("image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47]));
		expect(result.error).toBe("Unsupported content type: image/png");
	});

	it("reports an empty body", async () => {
		const result = await fetchBody("text/plain", "");
		expect(result.error).toBe("Response body is empty");
	});
});

describe("limits", () => {
	it("refuses a body over maxBytes", async () => {
		const url = await serve("text/plain", "x".repeat(4096));
		const result = await extractContent(url, { allowRanges: ["127.0.0.0/8"], maxBytes: 1024 });
		expect(result.error).toBe("Response exceeds 1KB limit");
	});

	it("reports the caller's cancellation rather than the internal deadline", async () => {
		const controller = new AbortController();
		controller.abort();
		const result = await extractContent("https://example.com", { signal: controller.signal });
		expect(result.error).toBe("Aborted");
	});
});
