import type { DocPage } from "./types";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PAGES = 30;

export async function extractPdf(file: File): Promise<{ pages: DocPage[]; warning?: string }> {
  const name = file.name.toLowerCase();
  if (file.type !== "application/pdf" && !name.endsWith(".pdf")) {
    throw new Error("Only PDF files are accepted.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("That PDF is over 8 MB. Split it or upload a shorter file.");
  }
  if (file.size < 64) {
    throw new Error("The file looks empty or corrupted.");
  }

  const pdfjs = await import("pdfjs-dist");
  const workerMod = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;

  const data = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await pdfjs.getDocument({ data }).promise;
  } catch {
    throw new Error("Could not open this PDF. It may be corrupted or password-protected.");
  }

  const pages: DocPage[] = [];
  const count = Math.min(doc.numPages, MAX_PAGES);
  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
    if (text) pages.push({ page: i, text });
  }

  const notes: string[] = [];
  if (doc.numPages > MAX_PAGES) notes.push(`Only the first ${MAX_PAGES} pages were indexed.`);
  if (!pages.length) {
    notes.push(
      "No selectable text was found. This often means a scanned PDF. OCR is not included — paste the text as a note, or upload a text-based PDF.",
    );
  }
  return { pages, warning: notes.join(" ") || undefined };
}
