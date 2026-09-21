/**
 * A minimal PDF writer, for fixtures.
 *
 * Writing the bytes directly avoids depending on a renderer: ImageMagick needs
 * fontconfig to draw text and fails without it, and Ghostscript is a large
 * dependency to add for a handful of test documents. Helvetica is one of the
 * fourteen fonts every PDF reader is required to provide, so nothing has to be
 * embedded.
 */

/** Escape the characters that end a PDF string literal. */
function escape(text: string): string {
	return text.replace(/([()\\])/g, "\\$1");
}

/** Lay out one page's lines as text-drawing operators. */
function pageStream(lines: readonly string[]): string {
	return lines.map((line, index) => `BT /F1 12 Tf 50 ${750 - index * 18} Td (${escape(line)}) Tj ET`).join("\n");
}

/** Build a PDF whose pages hold the given lines of text. */
export function makePdf(pages: readonly (readonly string[])[]): Buffer {
	const objects: string[] = [];

	// Object numbers are 1-based, and each page takes two objects: the page
	// itself and its content stream.
	const kids = pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ");
	objects.push("<< /Type /Catalog /Pages 2 0 R >>");
	objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
	objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

	for (const lines of pages) {
		const stream = pageStream(lines);
		objects.push(
			`<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R >> >>` +
				` /MediaBox [0 0 612 792] /Contents ${objects.length + 2} 0 R >>`,
		);
		objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
	}

	let body = "%PDF-1.4\n";
	const offsets: number[] = [];
	for (const [index, object] of objects.entries()) {
		offsets.push(body.length);
		body += `${index + 1} 0 obj\n${object}\nendobj\n`;
	}

	// The cross-reference table records where each object starts, which is what
	// lets a reader seek instead of scanning.
	const startxref = body.length;
	body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	body += offsets.map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
	body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

	// latin1 keeps one byte per character, so the recorded offsets stay correct.
	return Buffer.from(body, "latin1");
}
