import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DAY_NAMES } from "@/lib/copilot/college";
import { attendanceMath } from "@/lib/copilot/math";
import { useCopilot } from "@/lib/copilot/store";

export const Route = createFileRoute("/app/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const loggedIn = useCopilot((s) => s.loggedIn);
  const profile = useCopilot((s) => s.profile);
  const session = useCopilot((s) => s.session);
  const slots = useCopilot((s) => s.slots);
  const exams = useCopilot((s) => s.exams);
  const chapters = useCopilot((s) => s.chapters);
  const subjects = useCopilot((s) => s.subjects);
  const plans = useCopilot((s) => s.plans);
  const docs = useCopilot((s) => s.docs);
  const target = useCopilot((s) => s.attendanceTarget);
  const toggleChapter = useCopilot((s) => s.toggleChapter);
  const name = profile.nickname || "there";
  const today = new Date();
  const weekday = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const now = today.getHours() * 60 + today.getMinutes();
  const todaySlots = slots
    .filter((s) => s.weekday === weekday)
    .sort((a, b) => a.start.localeCompare(b.start));
  const next = todaySlots.find((s) => {
    const [h, m] = s.start.split(":").map(Number);
    return h * 60 + m >= now;
  });
  const upcoming = exams
    .filter((e) => e.date)
    .map((e) => ({ ...e, days: daysUntil(e.date) }))
    .filter((e) => e.days >= 0)
    .sort((a, b) => a.days - b.days);
  const openChapters = chapters.filter((c) => !c.done);
  const openTasks = plans.flatMap((p) => p.days.flatMap((d) => d.tasks)).filter((t) => !t.done);

  useEffect(() => {
    if (!loggedIn) navigate({ to: "/" });
  }, [loggedIn, navigate]);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted">{today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="font-display text-3xl font-semibold">Yo, {name}</h1>
        <p className="text-sm text-muted">
          {profile.branch || "Branch not set"}
          {session?.section ? ` · Section ${session.section}` : ""}
        </p>
      </header>

      {!slots.length && !subjects.length && (
        <section className="glass p-4 text-sm">
          <p>Today is empty until you import a routine. Upload text-based PDFs once, then check the rows before saving.</p>
          <Link to="/app/setup" className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg">
            Open College Setup
          </Link>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <article className="glass p-4">
          <p className="text-xs font-semibold tracking-wide text-accent">Next up</p>
          <h2 className="font-display mt-1 text-lg">{next ? next.subject : "None left today"}</h2>
          <p className="text-sm text-muted">{next ? `${next.start}–${next.end}${next.room ? ` · ${next.room}` : ""}` : "No later class is on the approved timetable."}</p>
        </article>
        <article className="glass p-4">
          <p className="text-xs font-semibold tracking-wide text-accent">Boss fight</p>
          <h2 className="font-display mt-1 text-lg">{upcoming[0] ? upcoming[0].subject : "No dated exam"}</h2>
          <p className="text-sm text-muted">{upcoming[0] ? `${upcoming[0].date} · ${upcoming[0].days} day(s)` : "Import an exam sheet with a real date."}</p>
        </article>
        <article className="glass p-4">
          <p className="text-xs font-semibold tracking-wide text-accent">Chapters left</p>
          <h2 className="font-display mt-1 text-lg">{openChapters.length}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {chapters.slice(0, 4).map((c) => (
              <li key={c.id}>
                <button type="button" className="text-left" onClick={() => toggleChapter(c.id)}>
                  <span className={c.done ? "text-muted line-through" : ""}>{c.title}</span>
                </button>
              </li>
            ))}
            {chapters.length === 0 && <li className="text-muted">No syllabus chapters saved yet.</li>}
          </ul>
        </article>
      </section>

      <section className="glass p-4">
        <h2 className="font-display font-semibold">Don’t forget</h2>
        <p className="text-xs text-muted">Shown while this app is open. They do not fire after you close the browser.</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>{next ? `Class: ${next.subject} at ${next.start}${next.room ? `, ${next.room}` : ""}` : "No later class today."}</li>
          <li>{upcoming[0] ? `Exam: ${upcoming[0].subject} on ${upcoming[0].date}` : "No dated exam saved."}</li>
          <li>{openChapters[0] ? `Chapter still open: ${openChapters[0].title}` : "No open chapter."}</li>
        </ul>
      </section>

      <section className="glass p-4">
        <h2 className="font-display font-semibold">Today · {DAY_NAMES[weekday]}</h2>
        {todaySlots.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No class recorded for this weekday.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {todaySlots.map((s) => (
              <li key={s.id}><span className="text-accent">{s.start}</span> {s.subject}{s.room ? ` · ${s.room}` : ""}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass p-4">
        <h2 className="font-display font-semibold">Pull-up score by subject</h2>
        <p className="text-xs text-muted">Estimates from totals you approved. A scheduled class is not counted as held.</p>
        {subjects.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No attendance lines imported. Use “Subject attended 20 of 30” in a text PDF or CSV.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {subjects.map((s) => {
              const math = attendanceMath(s.held, s.attended, target);
              return (
                <li key={s.id} className="flex flex-wrap justify-between gap-2">
                  <span>{s.name}</span>
                  <span className="text-muted">{s.attended}/{s.held} · {s.held ? `${math.percentage}%` : "—"} · can miss {math.safeToMiss}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <article className="glass p-4 text-sm">
          <h2 className="font-display font-semibold">Study checklist</h2>
          {openTasks.length === 0 ? <p className="mt-2 text-muted">No open tasks on a saved plan.</p> : (
            <ul className="mt-2 space-y-1">{openTasks.slice(0, 5).map((t) => <li key={t.id}>{t.title}</li>)}</ul>
          )}
        </article>
        <article className="glass p-4 text-sm">
          <h2 className="font-display font-semibold">Recent PDFs</h2>
          {docs.length === 0 ? <p className="mt-2 text-muted">No documents on this device.</p> : (
            <ul className="mt-2 space-y-1">{docs.slice(0, 4).map((d) => <li key={d.id}>{d.name}</li>)}</ul>
          )}
        </article>
      </section>
    </div>
  );
}

function daysUntil(iso: string) {
  const target = new Date(`${iso}T00:00:00`);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}
