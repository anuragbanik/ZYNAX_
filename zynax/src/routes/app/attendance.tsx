import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck2, Check, Minus, Plus, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { parseCollegeText } from "@/lib/copilot/college";
import { attendanceMath } from "@/lib/copilot/math";
import { extractPdf } from "@/lib/copilot/pdf";
import { newId, useCopilot } from "@/lib/copilot/store";
import type { SubjectRec } from "@/lib/copilot/types";

export const Route = createFileRoute("/app/attendance")({
  component: AttendancePage,
});

type Seed = { name: string; held: number; attended: number };

/** "Maths 20/30", "Maths, 20, 30", "Maths 20 of 30" or just "Maths". One subject per line. */
function parseList(text: string): Seed[] {
  const out: Seed[] = [];
  for (const raw of text.split(/\r?\n|;/)) {
    const line = raw.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, "");
    if (!line) continue;
    const m = line.match(/^(.+?)[\s,:-]+(\d+)\s*(?:\/|of|,)\s*(\d+)$/i);
    if (m) {
      const attended = Number(m[2]);
      const held = Number(m[3]);
      out.push({ name: m[1].trim(), held: Math.max(held, attended), attended: Math.min(attended, Math.max(held, attended)) });
    } else {
      out.push({ name: line, held: 0, attended: 0 });
    }
  }
  return out;
}

function AttendancePage() {
  const subjects = useCopilot((s) => s.subjects);
  const target = useCopilot((s) => s.attendanceTarget);
  const setSubjects = useCopilot((s) => s.setSubjects);
  const setTotals = useCopilot((s) => s.setSubjectTotals);
  const setTarget = useCopilot((s) => s.setAttendanceTarget);
  const [name, setName] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const totalHeld = subjects.reduce((n, s) => n + s.held, 0);
  const totalAttended = subjects.reduce((n, s) => n + s.attended, 0);
  const overall = totalHeld ? Math.round((totalAttended / totalHeld) * 1000) / 10 : null;
  const targetPct = Math.round(target * 100);

  function merge(seeds: Seed[]) {
    const byName = new Map<string, SubjectRec>(subjects.map((s) => [s.name.toLowerCase(), s]));
    let added = 0;
    for (const seed of seeds) {
      const key = seed.name.toLowerCase();
      const prev = byName.get(key);
      if (prev) {
        // Only overwrite totals when the new line actually carries numbers.
        if (seed.held > 0) byName.set(key, { ...prev, held: seed.held, attended: seed.attended });
      } else {
        byName.set(key, { id: newId(), name: seed.name, code: "", faculty: "", held: seed.held, attended: seed.attended });
        added += 1;
      }
    }
    setSubjects([...byName.values()]);
    return added;
  }

  function addOne(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const added = merge([{ name: clean, held: 0, attended: 0 }]);
    setMsg(added ? `Added ${clean}.` : `${clean} is already in your list.`);
    setName("");
  }

  function addPasted() {
    const seeds = parseList(paste);
    if (!seeds.length) {
      setMsg("Nothing to add — put one subject per line.");
      return;
    }
    const added = merge(seeds);
    setMsg(`${added} new subject${added === 1 ? "" : "s"} added.`);
    setPaste("");
    setShowPaste(false);
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setMsg("");
    const seeds: Seed[] = [];
    const problems: string[] = [];
    for (const file of Array.from(list)) {
      try {
        let text: string;
        if (file.name.toLowerCase().endsWith(".csv") || file.type.startsWith("text/")) {
          text = await file.text();
        } else {
          const extracted = await extractPdf(file);
          if (extracted.warning) problems.push(`${file.name}: ${extracted.warning}`);
          text = extracted.pages.map((p) => p.text).join("\n");
        }
        const parsed = parseCollegeText(text, file.name);
        for (const row of parsed.attendance) seeds.push({ name: row.subject, held: row.held, attended: row.attended });
        for (const slot of parsed.slots) seeds.push({ name: slot.subject, held: 0, attended: 0 });
        // A plain list file (one subject per line) is also fine.
        if (!parsed.attendance.length && !parsed.slots.length) seeds.push(...parseList(text).filter((s) => s.name.length < 60));
      } catch (err) {
        problems.push(`${file.name}: ${err instanceof Error ? err.message : "could not be read."}`);
      }
    }
    const added = seeds.length ? merge(seeds) : 0;
    setMsg(
      [added ? `${added} subject${added === 1 ? "" : "s"} added from your upload.` : "No subjects found in that file.", ...problems].join(" "),
    );
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      {/* Billboard */}
      <section className="nf-billboard p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#A78BFA]">
              <CalendarCheck2 className="size-3.5" /> PULL UP TRACKER
            </p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
              {overall === null ? "Start tracking" : <span className="text-gradient">{overall}%</span>}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {overall === null
                ? "Drop your subjects, then tap + after every class you pull up to."
                : `${totalAttended} attended of ${totalHeld} classes across ${subjects.length} subject${subjects.length === 1 ? "" : "s"}.`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] tracking-wide text-muted">TARGET</p>
            <Stepper
              label="target attendance"
              value={`${targetPct}%`}
              onMinus={() => setTarget(Math.round((target - 0.05) * 100) / 100)}
              onPlus={() => setTarget(Math.round((target + 0.05) * 100) / 100)}
              minusDisabled={targetPct <= 50}
              plusDisabled={targetPct >= 99}
            />
          </div>
        </div>
      </section>

      {/* Add subjects */}
      <section className="glass space-y-3 p-4">
        <h2 className="font-display font-semibold">Drop your subjects</h2>
        <form onSubmit={addOne} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Subject name, e.g. Engineering Physics"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-[#8B5CF6]"
          />
          <button
            type="submit"
            aria-label="Add subject"
            className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-primary text-primary-fg"
          >
            <Plus className="size-5" />
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium">
            <Upload className="size-4 text-[#A78BFA]" />
            {busy ? "Reading…" : "Upload subjects"}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="application/pdf,.pdf,text/csv,.csv,text/plain,.txt"
              className="sr-only"
              onChange={(e) => void onFiles(e.target.files)}
            />
          </label>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium"
            onClick={() => setShowPaste((v) => !v)}
          >
            Paste a list
          </button>
        </div>
        {showPaste && (
          <div className="space-y-2">
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={5}
              placeholder={"One subject per line. Optional totals:\nMathematics 18/24\nEngineering Physics 20 of 26\nChemistry"}
              className="w-full rounded-xl border border-border bg-bg p-3 text-sm outline-none focus:border-[#8B5CF6]"
            />
            <button type="button" onClick={addPasted} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-fg">
              Add to tracker
            </button>
          </div>
        )}
        <p className="text-xs text-muted">
          Upload a text-based routine / attendance PDF, a CSV, or a plain list. Scanned images are not read. Subjects from a
          routine start at 0/0 — a scheduled class is never counted as held.
        </p>
        {msg && <p className="text-sm text-accent">{msg}</p>}
      </section>

      {/* Subject cards */}
      {subjects.length === 0 ? (
        <section className="glass p-8 text-center">
          <p className="font-display text-lg font-semibold">No subjects yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Upload your subjects or add one above. Each card gets its own + / − counters.</p>
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              target={target}
              onChange={(held, attended) => setTotals(s.id, held, attended)}
              onRemove={() => setSubjects(subjects.filter((x) => x.id !== s.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectCard({
  subject,
  target,
  onChange,
  onRemove,
}: {
  subject: SubjectRec;
  target: number;
  onChange: (held: number, attended: number) => void;
  onRemove: () => void;
}) {
  const { held, attended } = subject;
  const math = attendanceMath(held, attended, target);
  const pct = held ? Math.min(100, math.percentage) : 0;
  const ok = held === 0 || attended / held >= target;
  const tone = held === 0 ? "text-muted" : ok ? "text-emerald-400" : "text-danger";
  const bar = ok ? "from-[#A78BFA] to-[#8B5CF6]" : "from-rose-400 to-rose-500";

  return (
    <article className="glass space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display truncate font-semibold">{subject.name}</h3>
          <p className={`mt-0.5 text-xs ${tone}`}>
            {held === 0
              ? "No classes logged yet"
              : ok
                ? `On track · can miss ${math.safeToMiss} more`
                : `Below target · attend ${math.classesNeeded} in a row`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className={`font-display text-2xl font-semibold ${held ? "" : "text-muted"}`}>{held ? `${math.percentage}%` : "—"}</span>
          <button
            type="button"
            aria-label={`Remove ${subject.name}`}
            onClick={onRemove}
            className="grid size-9 place-items-center rounded-full text-muted hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* progress with target marker */}
      <div className="relative h-2.5 rounded-full bg-surface-2">
        <div className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all duration-300`} style={{ width: `${pct}%` }} />
        <span
          className="absolute -top-1 h-4.5 w-0.5 rounded bg-fg/70"
          style={{ left: `${Math.round(target * 100)}%` }}
          title={`Target ${Math.round(target * 100)}%`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[11px] tracking-wide text-muted">ATTENDED</p>
          <Stepper
            label="attended"
            value={String(attended)}
            onMinus={() => onChange(held, attended - 1)}
            onPlus={() => onChange(Math.max(held, attended + 1), attended + 1)}
            minusDisabled={attended <= 0}
          />
        </div>
        <div>
          <p className="mb-1.5 text-[11px] tracking-wide text-muted">HELD</p>
          <Stepper
            label="classes held"
            value={String(held)}
            onMinus={() => onChange(held - 1, attended)}
            onPlus={() => onChange(held + 1, attended)}
            minusDisabled={held <= 0}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange(held + 1, attended + 1)}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 text-sm font-semibold text-emerald-400 active:scale-95"
        >
          <Check className="size-4" /> Pulled up
        </button>
        <button
          type="button"
          onClick={() => onChange(held + 1, attended)}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-rose-500/15 text-sm font-semibold text-rose-400 active:scale-95"
        >
          <X className="size-4" /> Ghosted
        </button>
      </div>
    </article>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
}) {
  const btn =
    "grid size-11 shrink-0 place-items-center rounded-full text-fg transition active:scale-90 disabled:opacity-30";
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-bg p-0.5">
      <button type="button" aria-label={`Decrease ${label}`} onClick={onMinus} disabled={minusDisabled} className={`${btn} hover:bg-surface-2`}>
        <Minus className="size-4" />
      </button>
      <span className="font-display min-w-10 text-center text-base font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={onPlus}
        disabled={plusDisabled}
        className={`${btn} nav-pill-active text-white`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
