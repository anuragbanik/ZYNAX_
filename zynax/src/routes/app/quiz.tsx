import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { askCopilot } from "@/lib/copilot/ai";
import { extractJson } from "@/lib/copilot/json";
import { chunksForDoc } from "@/lib/copilot/retrieve";
import { profileBlurb, useCopilot } from "@/lib/copilot/store";

export const Route = createFileRoute("/app/quiz")({
  component: QuizPage,
});

type Q = { prompt: string; choices: string[]; answer: number; explanation: string; source: string };

function QuizPage() {
  const docs = useCopilot((s) => s.docs);
  const profile = useCopilot((s) => s.profile);
  const [docId, setDocId] = useState(docs[0]?.id ?? "");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    const doc = docs.find((d) => d.id === docId) ?? docs[0];
    if (!doc?.pages.length) {
      setError("Choose a document that has extracted text.");
      return;
    }
    setBusy(true);
    setError("");
    setRevealed(false);
    setPicks({});
    try {
      const res = await askCopilot({
        data: {
          mode: "quiz",
          question: "Write a short multiple-choice quiz using only this document.",
          profile: profileBlurb(profile),
          chunks: chunksForDoc(doc, 6),
        },
      });
      if (!res.ok) throw new Error(res.error);
      const parsed = extractJson(res.text) as { questions?: Q[]; reason?: string };
      const clean = (parsed.questions ?? [])
        .filter((q) => q.prompt && Array.isArray(q.choices) && q.choices.length >= 2)
        .slice(0, 5)
        .map((q) => ({
          prompt: q.prompt,
          choices: q.choices.slice(0, 4),
          answer: Number(q.answer) || 0,
          explanation: q.explanation || "",
          source: q.source || doc.name,
        }));
      if (!clean.length) throw new Error(parsed.reason || "No quiz questions were returned.");
      setQuestions(clean);
    } catch (err) {
      setQuestions([]);
      setError(err instanceof Error ? err.message : "Quiz failed.");
    } finally {
      setBusy(false);
    }
  }

  const score = questions.reduce((n, q, i) => n + (picks[i] === q.answer ? 1 : 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Boss Battle</h1>
        <p className="text-sm text-muted">Questions are AI-generated from the selected document. They are practice, not an official paper.</p>
      </div>
      {docs.length === 0 ? (
        <p className="text-sm text-muted">Upload a PDF or load the sample syllabus first.</p>
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
          <button disabled={busy} onClick={() => void generate()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-50">
            {busy ? "Writing quiz…" : "Generate a quiz"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {questions.map((q, i) => (
        <article key={q.prompt} className="glass p-4">
          <h2 className="font-semibold">{i + 1}. {q.prompt}</h2>
          <div className="mt-3 space-y-2">
            {q.choices.map((choice, ci) => {
              const selected = picks[i] === ci;
              const show = revealed && ci === q.answer;
              return (
                <button
                  key={choice}
                  disabled={revealed}
                  onClick={() => setPicks((p) => ({ ...p, [i]: ci }))}
                  className={`block w-full rounded-xl border px-3 py-2 text-left text-sm ${show ? "border-accent" : selected ? "border-primary" : "border-border"}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
          {revealed && (
            <p className="mt-3 text-sm text-muted">{q.explanation} {q.source && `Source note: ${q.source}`}</p>
          )}
        </article>
      ))}
      {questions.length > 0 && !revealed && (
        <button className="rounded-full border border-border px-4 py-2 text-sm" onClick={() => setRevealed(true)}>
          Show answers
        </button>
      )}
      {revealed && <p className="font-semibold">Session score: {score} / {questions.length}</p>}
    </div>
  );
}
