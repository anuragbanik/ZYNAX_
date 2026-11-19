import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Markdown } from "@/components/markdown";
import { askCopilot } from "@/lib/copilot/ai";
import { extractJson } from "@/lib/copilot/json";
import { chunksForDoc } from "@/lib/copilot/retrieve";
import { profileBlurb, useCopilot } from "@/lib/copilot/store";
import type { Flashcard } from "@/lib/copilot/types";

export const Route = createFileRoute("/app/notes")({
  component: NotesPage,
});

function NotesPage() {
  const docs = useCopilot((s) => s.docs);
  const profile = useCopilot((s) => s.profile);
  const flashcards = useCopilot((s) => s.flashcards);
  const setFlashcards = useCopilot((s) => s.setFlashcards);
  const [docId, setDocId] = useState(docs[0]?.id ?? "");
  const [summary, setSummary] = useState("");
  const [concepts, setConcepts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flip, setFlip] = useState<number | null>(null);

  async function run() {
    const doc = docs.find((d) => d.id === docId) ?? docs[0];
    if (!doc || !doc.pages.length) {
      setError("Upload or load a document with extractable text first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await askCopilot({
        data: {
          mode: "notes",
          question: "Summarize this document for revision. Extract key concepts and make flashcards only from the excerpts.",
          profile: profileBlurb(profile),
          chunks: chunksForDoc(doc, 6),
        },
      });
      if (!res.ok) throw new Error(res.error);
      const parsed = extractJson(res.text) as {
        summary?: string;
        concepts?: string[];
        flashcards?: { front?: string; back?: string }[];
      };
      setSummary(parsed.summary || "");
      setConcepts((parsed.concepts ?? []).filter(Boolean).slice(0, 8));
      const cards: Flashcard[] = (parsed.flashcards ?? [])
        .filter((c) => c.front && c.back)
        .slice(0, 8)
        .map((c) => ({ front: c.front!, back: c.back! }));
      setFlashcards(cards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not summarize.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Brain Dump</h1>
        <p className="text-sm text-muted">Summaries are generated from a document you selected. Check them against the source.</p>
      </div>
      {docs.length === 0 ? (
        <p className="text-sm text-muted">No documents yet. Add one under My College PDFs.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            Document
            <select value={docId} onChange={(e) => setDocId(e.target.value)} className="mt-1 block rounded-xl border border-border bg-surface px-3 py-2">
              {docs.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          <button disabled={busy} onClick={() => void run()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-50">
            {busy ? "Summarizing…" : "Summarize"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {summary && (
        <section className="glass p-4">
          <h2 className="font-display mb-2 font-semibold">Revision notes</h2>
          <Markdown text={summary} />
          {concepts.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm">
              {concepts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      {flashcards.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2">
          {flashcards.map((card, i) => (
            <button key={card.front} className="glass p-4 text-left" onClick={() => setFlip(flip === i ? null : i)}>
              <div className="text-xs text-muted">{flip === i ? "Answer" : "Prompt"}</div>
              <div className="mt-2 text-sm">{flip === i ? card.back : card.front}</div>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
