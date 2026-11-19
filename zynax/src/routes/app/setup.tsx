import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { overlappingPairs, parseCollegeText, slotDiff, type ParsedSlot } from "@/lib/copilot/college";
import { extractPdf } from "@/lib/copilot/pdf";
import { newId, useCopilot } from "@/lib/copilot/store";
import type { ChapterRec, ExamRec, SubjectRec } from "@/lib/copilot/types";

export const Route = createFileRoute("/app/setup")({
  component: SetupPage,
});

type FileDraft = {
  name: string;
  warning?: string;
  text: string;
  parsed: ReturnType<typeof parseCollegeText>;
};

function SetupPage() {
  const navigate = useNavigate();
  const slots = useCopilot((s) => s.slots);
  const replaceSlots = useCopilot((s) => s.replaceSlots);
  const setSubjects = useCopilot((s) => s.setSubjects);
  const setExams = useCopilot((s) => s.setExams);
  const setChapters = useCopilot((s) => s.setChapters);
  const addDoc = useCopilot((s) => s.addDoc);
  const subjects = useCopilot((s) => s.subjects);
  const [drafts, setDrafts] = useState<FileDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setError("");
    setSaved("");
    const next: FileDraft[] = [];
    for (const file of Array.from(list)) {
      try {
        if (file.name.toLowerCase().endsWith(".csv") || file.type.startsWith("text/")) {
          const text = await file.text();
          next.push({ name: file.name, text, parsed: parseCollegeText(text, file.name) });
          continue;
        }
        const extracted = await extractPdf(file);
        const text = extracted.pages.map((p) => p.text).join("\n");
        next.push({
          name: file.name,
          warning: extracted.warning,
          text,
          parsed: parseCollegeText(text, file.name),
        });
        addDoc({
          id: newId(),
          name: file.name,
          size: file.size,
          uploadedAt: Date.now(),
          pages: extracted.pages,
          kind: "pdf",
          warning: extracted.warning,
        });
      } catch (err) {
        next.push({
          name: file.name,
          warning: err instanceof Error ? err.message : "Could not read this file.",
          text: "",
          parsed: parseCollegeText("", file.name),
        });
      }
    }
    setDrafts(next);
    setBusy(false);
  }

  function save() {
    const parsedSlots: ParsedSlot[] = drafts.flatMap((d) => d.parsed.slots);
    const overlaps = overlappingPairs(parsedSlots);
    if (overlaps.length) {
      setError(overlaps[0] + " Fix the file or remove a row before saving.");
      return;
    }
    const diff = slotDiff(slots, parsedSlots);
    if (parsedSlots.length) replaceSlots(parsedSlots);

    const byName = new Map<string, SubjectRec>();
    for (const existing of subjects) byName.set(existing.name.toLowerCase(), existing);
    for (const row of drafts.flatMap((d) => d.parsed.attendance)) {
      const key = row.subject.toLowerCase();
      const prev = byName.get(key);
      byName.set(key, {
        id: prev?.id ?? newId(),
        name: row.subject,
        code: prev?.code ?? "",
        faculty: prev?.faculty ?? "",
        held: row.held,
        attended: row.attended,
      });
    }
    for (const slot of parsedSlots) {
      const key = slot.subject.toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, { id: newId(), name: slot.subject, code: "", faculty: slot.faculty, held: 0, attended: 0 });
      }
    }
    setSubjects([...byName.values()]);

    const exams: ExamRec[] = drafts.flatMap((d) =>
      d.parsed.exams
        .filter((e) => e.date)
        .map((e) => ({ id: newId(), ...e })),
    );
    if (exams.length) setExams(exams);

    const chapters: ChapterRec[] = drafts.flatMap((d) =>
      d.parsed.chapters.map((c) => ({ id: newId(), subject: c.subject, title: c.title, done: false })),
    );
    if (chapters.length) setChapters(chapters);

    setSaved(
      parsedSlots.length
        ? `Saved. Timetable change: ${diff.added} added, ${diff.removed} removed. Attendance and completed study tasks elsewhere were not wiped.`
        : "Saved the rows that could be read. No class lines were found, so the current timetable was left as it is.",
    );
    setError("");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Lock In</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Upload the routine, exam sheet, syllabus, and attendance together. Text PDFs and CSV files are read here. Image-only scans are not OCR’d — you will see that clearly, not a fake success.
        </p>
      </div>
      <label className="glass block cursor-pointer p-6 text-sm">
        <span className="font-semibold">Choose PDFs or CSV files</span>
        <input
          className="mt-3 block w-full text-sm"
          type="file"
          accept="application/pdf,.pdf,text/csv,.csv,text/plain"
          multiple
          onChange={(e) => void onFiles(e.target.files)}
        />
      </label>
      {busy && <p className="text-sm text-muted">Reading files…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-accent">{saved}</p>}
      {drafts.map((draft) => (
        <article key={draft.name} className="glass space-y-2 p-4 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">{draft.name}</h2>
            <span className="text-xs uppercase tracking-wide text-accent">{draft.parsed.kind}</span>
          </div>
          {draft.warning && <p className="text-danger">{draft.warning}</p>}
          {draft.parsed.warnings.map((w) => (
            <p key={w} className="text-muted">{w}</p>
          ))}
          <ul className="space-y-1 text-muted">
            {draft.parsed.slots.slice(0, 8).map((s) => (
              <li key={`${s.weekday}-${s.start}-${s.subject}`}>Class · {s.subject} · {s.start}–{s.end}{s.room ? ` · ${s.room}` : ""}</li>
            ))}
            {draft.parsed.exams.map((e) => (
              <li key={e.subject + e.date}>Exam · {e.subject} · {e.date || "date unclear"}</li>
            ))}
            {draft.parsed.attendance.map((a) => (
              <li key={a.subject}>Attendance · {a.subject} · {a.attended}/{a.held}</li>
            ))}
            {draft.parsed.chapters.slice(0, 8).map((c) => (
              <li key={c.title}>Chapter · {c.subject} · {c.title}</li>
            ))}
          </ul>
        </article>
      ))}
      {drafts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg" onClick={save}>
            Save verified rows
          </button>
          <button type="button" className="rounded-full border border-border px-4 py-2 text-sm" onClick={() => navigate({ to: "/app" })}>
            Back to today
          </button>
        </div>
      )}
    </div>
  );
}
