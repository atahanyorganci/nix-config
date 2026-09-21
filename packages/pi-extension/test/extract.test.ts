import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

/** Serve a bare status code, for the paths where only the status matters. */
function serveStatus(status: number): Promise<string> {
	return new Promise(resolve => {
		const server = createServer((_request, response) => {
			response.statusCode = status;
			response.end();
		});
		servers.push(server);
		server.listen(0, "127.0.0.1", () => {
			resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}/gone.html`);
		});
	});
}

const fetchStatus = async (status: number) =>
	await extractContent(await serveStatus(status), { allowRanges: ["127.0.0.0/8"] });

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

	it("rejects an unhandled binary content type", async () => {
		const result = await fetchBody("application/octet-stream", Buffer.from([0x00, 0x01]));
		expect(result.error).toBe("Unsupported content type: application/octet-stream");
	});

	it("rejects a truncated image rather than forwarding it", async () => {
		// A PNG signature with no body: the content type is honest but the bytes
		// are not an image, and unusable image data reaches the model as an empty
		// response with no error attached.
		const result = await fetchBody("image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47]));
		expect(result.error).toContain("not a decodable image");
	});

	it("reports an empty body", async () => {
		const result = await fetchBody("text/plain", "");
		expect(result.error).toBe("Response body is empty");
	});
});

describe("images", () => {
	let png: Buffer;

	beforeAll(async () => {
		const dir = await mkdtemp(join(tmpdir(), "pi-extract-test-"));
		const path = join(dir, "wide.png");
		await promisify(execFile)("magick", ["-size", "1600x900", "xc:teal", path]);
		png = await readFile(path);
	});

	it("returns a normalized image instead of trying to read it as text", async () => {
		const result = await fetchBody("image/png", png);
		expect(result.error).toBeNull();
		expect(result.image).toMatchObject({
			mimeType: "image/jpeg",
			width: 1024,
			height: 576,
			originalFormat: "PNG",
			originalWidth: 1600,
			originalHeight: 900,
		});
	});

	it("carries base64 data that decodes back to a JPEG", async () => {
		const result = await fetchBody("image/png", png);
		const decoded = Buffer.from(result.image!.data, "base64");
		// JPEG start-of-image marker; proves the payload is the converted file
		// and not, say, the original PNG or a base64 round-trip of text.
		expect(decoded.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
	});

	it("writes the image somewhere the caller can read it later", async () => {
		const result = await fetchBody("image/png", png);
		await expect(readFile(result.image!.path)).resolves.toBeInstanceOf(Buffer);
	});

	it("detects an HTML error page served as an image", async () => {
		// Exactly how this fails in the wild: a 200 with the right content type
		// and an error page in the body.
		const result = await fetchBody("image/png", "<html><body>404 not found</body></html>");
		expect(result.error).toContain("not a decodable image");
	});
});

describe("HTTP failures", () => {
	it.each([
		[404, "search for the current URL"],
		[410, "search for the current URL"],
		[429, "rate limiting"],
		[403, "not public"],
		[503, "fault on the origin server"],
	])("explains HTTP %i", async (status, hint) => {
		const result = await fetchStatus(status);
		expect(result.error).toContain(hint);
	});

	it("still reports the status code itself", async () => {
		// The advice is additive: a caller keying on the number must still find it.
		const result = await fetchStatus(404);
		expect(result.error).toContain("HTTP 404");
	});

	it("leaves an unremarkable status without advice", async () => {
		const result = await fetchStatus(418);
		expect(result.error).toBe("HTTP 418: I'm a Teapot");
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
