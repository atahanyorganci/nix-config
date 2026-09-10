const path = process.argv[2];
const url = process.env.ESCPOS_URL ?? "http://127.0.0.1:8080/template/image/raw";

if (path === undefined) {
	console.error("usage: bun scripts/print-image.ts <image.png>");
	process.exit(1);
}

const png = await Bun.file(path).bytes();
const response = await fetch(url, {
	method: "POST",
	headers: { "Content-Type": "image/png" },
	body: png,
});

if (!response.ok) {
	console.error(`${response.status} ${await response.text()}`);
	process.exit(1);
}

console.log(`${response.status} printed ${path}`);
