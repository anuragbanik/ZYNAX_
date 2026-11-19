import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { askCopilot } from "@/lib/copilot/ai";
import { planFromChapters } from "@/lib/copilot/college";
import { extractJson } from "@/lib/copilot/json";
import { retrieve } from "@/lib/copilot/retrieve";
import { newId, profileBlurb, useCopilot } from "@/lib/copilot/store";
import type { StudyPlan } from "@/lib/copilot/types";

export const Route = createFileRoute("/app/study")({
  component: StudyPage,
});

function StudyPage() {
  const docs = useCopilot((s) => s.docs);
  const profile = useCopilot((s) => s.profile);
  const plans = useCopilot((s) => s.plans);
  const savePlan = useCopilot((s) => s.savePlan);
  const toggleTask = useCopilot((s) => s.toggleTask);
  const removePlan = useCopilot((s) => s.removePlan);
  const chapters = useCopilot((s) => s.chapters);
  const toggleChapter = useCopilot((s) => s.toggleChapter);
  const exams = useCopilot((s) => s.exams);
  const [subjects, setSubjects] = useState(profile.subjects);
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState(3);
  const [topics, setTopics] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  function checklistFromChapters() {
    const open = chapters.filter((c) => !c.done);
    if (!open.length) {
      setError("Import a syllabus with Unit or Chapter lines in College Setup first.");
      return;
    }
    const date = examDate || exams.find((e) => e.date)?.date || "";
    const days = planFromChapters(chapters, hours).map((day) => ({
      label: day.label,
      tasks: day.tasks.map((title) => ({ id: newId(), title, done: false })),
    }));
    savePlan({
      id: newId(),
      title: "Imported chapters",
      examDate: date || "not set",
      hours,
      days,
      createdAt: Date.now(),
      note: "Built from chapters you imported. Not a prediction of marks.",
    });
    setError("");
  }

  async function generate() {
    if (!subjects.trim() || !examDate) {
      setError("Add at least one subject and an exam date you chose.");
      return;
    }
    setBusy(true);
    setError("");
    const question = `Build a study plan. Subjects: ${subjects}. Student-entered exam date: ${examDate}. Hours available per day: ${hours}. Topics to cover: ${topics || "not specified"}. Use document excerpts only as topic hints.`;
    try {
      const res = await askCopilot({
        data: {
          mode: "plan",
          question,
          profile: profileBlurb(profile),
          chunks: retrieve(docs, `${subjects} ${topics}`, 4),
        },
      });
      if (!res.ok) throw new Error(res.error);
      const parsed = extractJson(res.text) as {
        title?: string;
        note?: string;
        days?: { label?: string; tasks?: string[] }[];
      };
      const days = (parsed.days ?? [])
        .slice(0, 10)
        .map((day) => ({
          label: day.label || "Study block",
          tasks: (day.tasks ?? []).slice(0, 6).map((title) => ({ id: newId(), title, done: false })),
        }))
        .filter((day) => day.tasks.length);
      if (!days.length) throw new Error("The plan came back empty. Try again.");
      const plan: StudyPlan = {
        id: newId(),
        title: parsed.title || `${subjects} plan`,
        examDate,
        hours,
        days,
        createdAt: Date.now(),
        note: parsed.note || "This is a suggestion, not a promise about marks.",
      };
      savePlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build a plan.");
    } finally {
      setBusy(false);
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Study Arc</h1>
        <p className="text-sm text-muted">Plans are editable checklists. They do not guarantee academic results.</p>
      </div>
      <section className="glass grid gap-3 p-4 md:grid-cols-2">
        <label className="text-sm">
          Subjects
          <input value={subjects} onChange={(e) => setSubjects(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2" />
        </label>
        <label className="text-sm">
          Exam date you entered
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2" />
        </label>
        <label className="text-sm">
          Hours per day
          <input type="number" min={1} max={12} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2" />
        </label>
        <label className="text-sm">
          Topics
          <input value={topics} onChange={(e) => setTopics(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2" />
        </label>
        <button type="button" onClick={checklistFromChapters} className="rounded-full border border-border px-4 py-2 text-sm font-semibold md:col-span-2">
          Build checklist from imported chapters
        </button>
        <button disabled={busy} onClick={() => void generate()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-50 md:col-span-2">
          {busy ? "Building plan…" : "Create a study plan"}
        </button>
        {error && <p className="text-sm text-danger md:col-span-2">{error}</p>}
      </section>

      {chapters.length > 0 && (
        <section className="glass p-4">
          <h2 className="font-display font-semibold">Imported chapters</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {chapters.map((c) => (
              <li key={c.id}>
                <button type="button" className="text-left" onClick={() => toggleChapter(c.id)}>
                  <span className={c.done ? "text-muted line-through" : ""}>{c.title}</span>
                  <span className="ml-2 text-xs text-accent">{c.done ? "Done" : "Mark done"}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {plans.map((plan) => (
        <article key={plan.id} className="glass p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold">{plan.title}</h2>
              <p className="text-xs text-muted">Exam date you entered: {plan.examDate} · {plan.hours}h/day</p>
              <p className="mt-1 text-sm text-muted">{plan.note}</p>
            </div>
            <button className="text-xs text-danger" onClick={() => removePlan(plan.id)}>Delete</button>
          </div>
          <div className="mt-3 space-y-3">
            {plan.days.map((day) => (
              <div key={day.label}>
                <div className="text-sm font-semibold">{day.label}</div>
                <ul className="mt-1 space-y-1">
                  {day.tasks.map((task) => (
                    <li key={task.id}>
                      <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" checked={task.done} onChange={() => toggleTask(plan.id, task.id)} />
                        <span className={task.done ? "text-muted line-through" : ""}>{task.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </article>
      ))}

      <section className="glass p-4 text-center">
        <h2 className="font-display font-semibold">Focus mode</h2>
        <div className="font-display my-3 text-5xl">{seconds === 0 ? "Done" : `${mm}:${ss}`}</div>
        <div className="flex justify-center gap-2">
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg" onClick={() => setRunning(true)}>Start</button>
          <button className="rounded-full border border-border px-4 py-2 text-sm" onClick={() => setRunning(false)}>Pause</button>
          <button className="rounded-full border border-border px-4 py-2 text-sm" onClick={() => { setRunning(false); setSeconds(25 * 60); }}>Reset</button>
        </div>
      </section>
    </div>
  );
}
