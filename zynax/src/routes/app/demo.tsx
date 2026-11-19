import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Markdown } from "@/components/markdown";
import { askCopilot } from "@/lib/copilot/ai";
import { attendanceMath } from "@/lib/copilot/math";
import { retrieve } from "@/lib/copilot/retrieve";
import { profileBlurb, useCopilot } from "@/lib/copilot/store";

export const Route = createFileRoute("/app/demo")({
  component: DemoPage,
});

const FLOW = ["Student", "Web interface", "Server", "PDF text retrieval", "AI provider", "Answer with sources"];

function DemoPage() {
  const docs = useCopilot((s) => s.docs);
  const loadSample = useCopilot((s) => s.loadSample);
  const profile = useCopilot((s) => s.profile);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [demoHeld, setDemoHeld] = useState(40);
  const [demoAttended, setDemoAttended] = useState(32);
  const demoMath = attendanceMath(demoHeld, demoAttended);
  const steps = [
    "Problem: first-year CSE/AIML students track routine, attendance, and exams in separate chats.",
    "Setup: one upload of text PDFs, then the student confirms rows before anything is saved.",
    "Today: the dashboard only shows approved classes, exams, and attendance totals.",
    "DEMO DATA stays on this page. Reset does not touch your real timetable.",
  ];

  async function askSample() {
    if (!docs.length) {
      setError("Upload a PDF or load the fictional sample syllabus first. No analysis is shown until a document exists.");
      setAnswer("");
      return;
    }
    const question = "What topics are included in Unit 2, and is there an assignment deadline written in the document?";
    setBusy(true);
    setError("");
    const chunks = retrieve(docs, question);
    setSources(chunks.map((c) => `${c.name}, p. ${c.page}`));
    try {
      const res = await askCopilot({
        data: { mode: "chat", question, profile: profileBlurb(profile), chunks },
      });
      if (!res.ok) setError(res.error);
      else setAnswer(res.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The live demo could not reach the AI.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="mesh glass px-6 py-10">
        <p className="text-sm font-semibold text-accent">Presentation Demo</p>
        <h1 className="font-display mt-2 text-4xl font-semibold md:text-5xl">ZYNAX</h1>
        <p className="mt-3 text-xl">Your Campus. Your Intelligence.</p>
        <p className="mt-4 max-w-2xl text-muted">
          College information is scattered across PDFs, notes, timetables, and notices. This assistant helps a student find and understand the academic text they actually uploaded.
        </p>
        <p className="mt-6 text-sm">Made by Anurag Banik</p>
      </header>

      <section className="glass space-y-3 p-4">
        <p className="text-xs font-semibold tracking-wide text-accent">DEMO DATA · not your records</p>
        <p className="text-sm">{steps[step]}</p>
        <p className="text-sm text-muted">
          Sample class: Mon 09:00 Data Structures, Room 210. Attendance {demoAttended}/{demoHeld} = {demoMath.percentage}% · safe to miss {demoMath.safeToMiss}.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-full border border-border px-3 py-1 text-sm" onClick={() => setDemoAttended((n) => Math.min(demoHeld, n + 1))}>Mark one more attended</button>
          <button type="button" className="rounded-full border border-border px-3 py-1 text-sm" onClick={() => { setDemoHeld(40); setDemoAttended(32); setStep(0); }}>Reset demo</button>
          <button type="button" className="rounded-full border border-border px-3 py-1 text-sm" onClick={() => setStep((n) => Math.max(0, n - 1))}>Previous</button>
          <button type="button" className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-fg" onClick={() => setStep((n) => Math.min(steps.length - 1, n + 1))}>Next</button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ["PDF intelligence", "Extracts text and cites the file and page."],
          ["AI chat", "Answers only claim a document fact when an excerpt supports it."],
          ["Notes, quizzes, plans", "Study tools built from the same uploaded text."],
        ].map(([title, text]) => (
          <article key={title} className="glass p-4">
            <h2 className="font-display font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted">{text}</p>
          </article>
        ))}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">How it works</h2>
        <ol className="mt-3 grid gap-2 md:grid-cols-3">
          {FLOW.map((step, i) => (
            <li key={step} className="glass px-4 py-3 text-sm">
              <span className="text-muted">{i + 1}.</span> {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="glass p-5">
        <h2 className="font-display text-xl font-semibold">Live demo</h2>
        <p className="mt-2 text-sm text-muted">
          Sample workflow: load or upload a syllabus, then ask what Unit 2 contains. The reply below is generated now. It is not a canned screenshot.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-full border border-border px-4 py-2 text-sm" onClick={loadSample}>Load fictional sample syllabus</button>
          <Link to="/app/pdfs" className="rounded-full border border-border px-4 py-2 text-sm">Upload a real PDF</Link>
          <Link to="/app/chat" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">Open AI chat</Link>
          <button disabled={busy} className="rounded-full bg-surface-2 px-4 py-2 text-sm" onClick={() => void askSample()}>
            {busy ? "Asking…" : "Ask about Unit 2"}
          </button>
        </div>
        {!docs.length && <p className="mt-4 text-sm text-warning">No document is loaded. Upload one or load the sample before expecting an answer.</p>}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {sources.length > 0 && <p className="mt-4 text-xs text-muted">Pages searched: {sources.join(" · ")}</p>}
        {answer && (
          <div className="mt-4 rounded-2xl bg-surface-2 p-4">
            <Markdown text={answer} />
          </div>
        )}
      </section>

      <footer className="text-sm text-muted">Built by Anurag Banik · ZYNAX</footer>
      <Link to="/app" className="text-sm text-primary">Back to the dashboard</Link>
    </div>
  );
}
