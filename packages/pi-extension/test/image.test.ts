import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { beforeAll, describe, expect, it } from "vitest";
import { identifyImage, normalizeImage } from "../src/fetch-content/image.ts";

/**
 * Fixtures are generated with ImageMagick at test time rather than committed,
 * so the suite carries no binaries and the inputs stay readable as code.
 */
const run = promisify(execFile);

let dir: string;
const at = (name: string) => join(dir, name);

/** Mean pixel value, 0 (black) to 65535 (white). Used to prove alpha handling. */
async function meanPixel(path: string): Promise<number> {
	const { stdout } = await run("identify", ["-format", "%[mean]", path]);
	return Number(stdout.trim());
}

beforeAll(async () => {
	dir = await mkdtemp(join(tmpdir(), "pi-image-test-"));
	await run("magick", ["-size", "2000x1200", "xc:navy", at("large.png")]);
	// Noise, not a flat fill: a solid colour compresses to a few hundred bytes
	// as PNG, which no JPEG can beat and which no real photograph resembles.
	await run("magick", ["-size", "2000x1200", "plasma:fractal", at("photo.png")]);
	await run("magick", ["-size", "64x64", "xc:orange", at("small.png")]);
	// A fully transparent canvas: without flattening it becomes black.
	await run("magick", ["-size", "300x300", "xc:transparent", at("alpha.png")]);
	await writeFile(at("fake.png"), "<html><body>not an image</body></html>");
	await writeFile(at("empty.png"), "");
});

describe("identifyImage", () => {
	it("reads format and dimensions", async () => {
		expect(await identifyImage(at("large.png"))).toEqual({ format: "PNG", width: 2000, height: 1200 });
	});

	it("rejects HTML wearing an image extension", async () => {
		// The exact failure this validation exists for: a mislabelled body
		// reaches the provider as undecodable bytes and returns nothing at all,
		// with no error to explain why.
		expect(await identifyImage(at("fake.png"))).toBeNull();
	});

	it("rejects an empty file", async () => {
		expect(await identifyImage(at("empty.png"))).toBeNull();
	});

	it("returns null for a missing path rather than throwing", async () => {
		expect(await identifyImage(at("absent.png"))).toBeNull();
	});
});

describe("normalizeImage", () => {
	it("shrinks an oversized image to fit the bound", async () => {
		const info = await normalizeImage(at("large.png"), at("large.jpg"));
		expect(info).toEqual({ format: "JPEG", width: 1024, height: 614 });
	});

	it("leaves a small image at its original size", async () => {
		// The `>` on the geometry only shrinks; upscaling would add blur and
		// bytes without adding detail.
		const info = await normalizeImage(at("small.png"), at("small.jpg"));
		expect(info).toMatchObject({ width: 64, height: 64 });
	});

	it("flattens transparency onto white, not black", async () => {
		// JPEG has no alpha channel and the default substitute is black, which
		// would turn a transparent logo into a dark rectangle.
		await normalizeImage(at("alpha.png"), at("alpha.jpg"));
		expect(await meanPixel(at("alpha.jpg"))).toBeGreaterThan(60000);
	});

	it("honours an explicit bound", async () => {
		const info = await normalizeImage(at("large.png"), at("bounded.jpg"), { maxDimension: 256 });
		expect(info).toMatchObject({ width: 256 });
	});

	it("substantially shrinks a photographic image", async () => {
		// The point of the conversion: detailed images are what blow up a tool
		// result, and this is where resizing and JPEG both earn their place.
		await normalizeImage(at("photo.png"), at("photo.jpg"));
		const before = (await readFile(at("photo.png"))).byteLength;
		const after = (await readFile(at("photo.jpg"))).byteLength;
		expect(after).toBeLessThan(before / 10);
	});

	it("returns null when the source is not an image", async () => {
		expect(await normalizeImage(at("fake.png"), at("fake.jpg"))).toBeNull();
	});
});
