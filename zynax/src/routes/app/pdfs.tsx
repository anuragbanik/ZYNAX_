import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Markdown } from "@/components/markdown";
import { askCopilot } from "@/lib/copilot/ai";
import { extractPdf } from "@/lib/copilot/pdf";
import { chunksForDoc } from "@/lib/copilot/retrieve";
import { newId, profileBlurb, useCopilot } from "@/lib/copilot/store";

export const Route = createFileRoute("/app/pdfs")({
  component: PdfsPage,
});

function PdfsPage() {
  const docs = useCopilot((s) => s.docs);
  const addDoc = useCopilot((s) => s.addDoc);
  const removeDoc = useCopilot((s) => s.removeDoc);
  const loadSample = useCopilot((s) => s.loadSample);
  const profile = useCopilot((s) => s.profile);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError("");
    setStatus("Reading PDF…");
    setBusy(true);
    try {
      const extracted = await extractPdf(file);
      addDoc({
        id: newId(),
        name: file.name,
        size: file.size,
        uploadedAt: Date.now(),
        pages: extracted.pages,
        kind: "pdf",
        warning: extracted.warning,
      });
      setStatus(extracted.pages.length ? `Indexed ${extracted.pages.length} page(s) from ${file.name}.` : "Uploaded, but no text could be indexed.");
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function addNote() {
    const text = noteBody.trim();
    if (!text) {
      setError("Paste some text first.");
      return;
    }
    addDoc({
      id: newId(),
      name: noteTitle.trim() || "Pasted notice",
      size: text.length,
      uploadedAt: Date.now(),
      pages: [{ page: 1, text: text.slice(0, 8000) }],
      kind: "note",
    });
    setNoteTitle("");
    setNoteBody("");
    setError("");
    setStatus("Saved the pasted text as a searchable document.");
  }

  async function findActions(id: string) {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    setBusy(true);
    setAnalysis("");
    setError("");
    try {
      const res = await askCopilot({
        data: {
          mode: "notice",
          question: "List action items, topics, and dates that are explicitly written in this document.",
          profile: profileBlurb(profile),
          chunks: chunksForDoc(doc, 6),
        },
      });
      setAnalysis(res.ok ? res.text : res.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyse the document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">The Stash</h1>
        <p className="mt-1 text-sm text-muted">Text is extracted in your browser and stored only in this browser. Scanned pages without a text layer cannot be read here.</p>
      </div>

      <label
        className="glass block cursor-pointer border-dashed p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <div className="font-semibold">Drop a PDF here or click to choose</div>
        <div className="mt-1 text-sm text-muted">PDF only, up to 8 MB, first 30 pages.</div>
      </label>

      {status && <p className="text-sm text-accent">{status}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button className="rounded-full border border-border px-4 py-2 text-sm" onClick={loadSample}>
          Load fictional sample syllabus
        </button>
      </div>

      <section className="space-y-3">
        {docs.length === 0 && <p className="text-sm text-muted">No documents yet.</p>}
        {docs.map((doc) => (
          <article key={doc.id} className="glass p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{doc.name}</h2>
                <p className="text-xs text-muted">
                  {doc.kind} · {(doc.size / 1024).toFixed(0)} KB · {doc.pages.length} text page(s)
                </p>
                {doc.warning && <p className="mt-1 text-sm text-warning">{doc.warning}</p>}
              </div>
              <div className="flex gap-2">
                <button className="rounded-full bg-surface-2 px-3 py-2 text-xs" onClick={() => setOpenId(openId === doc.id ? null : doc.id)}>
                  {openId === doc.id ? "Hide text" : "Preview text"}
                </button>
                <button className="rounded-full bg-surface-2 px-3 py-2 text-xs" disabled={busy || !doc.pages.length} onClick={() => void findActions(doc.id)}>
                  Extract dates & actions
                </button>
                <button className="rounded-full px-3 py-2 text-xs text-danger" onClick={() => removeDoc(doc.id)}>
                  Remove
                </button>
              </div>
            </div>
            {openId === doc.id && (
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted">
                {doc.pages.map((p) => `p.${p.page} ${p.text}`).join("\n\n").slice(0, 2500)}
              </pre>
            )}
          </article>
        ))}
      </section>

      {analysis && (
        <section className="glass p-4">
          <h2 className="font-display font-semibold">Document intelligence</h2>
          <p className="mb-2 text-xs text-muted">Verify important dates with your college. This is not an official notice.</p>
          <Markdown text={analysis} />
        </section>
      )}

      <section className="glass p-4">
        <h2 className="font-display font-semibold">Paste a notice or notes</h2>
        <p className="mb-3 text-sm text-muted">Useful when a PDF is scanned. The text becomes searchable like an upload.</p>
        <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Title" className="mb-2 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
        <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={5} placeholder="Paste the notice…" className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
        <button className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg" onClick={addNote}>
          Save as document
        </button>
      </section>
    </div>
  );
}
