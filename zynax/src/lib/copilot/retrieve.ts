import type { CampusDoc, Chunk } from "./types";

export function retrieve(docs: CampusDoc[], query: string, limit = 5): Chunk[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  if (!terms.length) return [];

  const hits: (Chunk & { score: number })[] = [];
  for (const doc of docs) {
    for (const page of doc.pages) {
      const lower = page.text.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (lower.includes(term)) score += 1;
      }
      if (score > 0) {
        hits.push({
          name: doc.name,
          page: page.page,
          text: page.text.slice(0, 1600),
          score,
        });
      }
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit).map(({ name, page, text }) => ({ name, page, text }));
}

export function chunksForDoc(doc: CampusDoc, limit = 6): Chunk[] {
  return doc.pages.slice(0, limit).map((p) => ({
    name: doc.name,
    page: p.page,
    text: p.text.slice(0, 1600),
  }));
}
