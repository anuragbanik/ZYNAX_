import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DAY_NAMES, overlappingPairs } from "@/lib/copilot/college";
import { useCopilot } from "@/lib/copilot/store";

export const Route = createFileRoute("/app/timetable")({
  component: TimetablePage,
});

function TimetablePage() {
  const slots = useCopilot((s) => s.slots);
  const addSlot = useCopilot((s) => s.addSlot);
  const removeSlot = useCopilot((s) => s.removeSlot);
  const [editing, setEditing] = useState(false);
  const [weekday, setWeekday] = useState(0);
  const [subject, setSubject] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [room, setRoom] = useState("");
  const [note, setNote] = useState("");
  const today = new Date().getDay();
  const weekdayIndex = today === 0 ? 6 : today - 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Daily Grind</h1>
          <p className="text-sm text-muted">Built from College Setup. Manual add is only for a correction.</p>
        </div>
        <Link to="/app/setup" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">
          Import routine
        </Link>
      </div>
      {!slots.length && (
        <p className="glass p-4 text-sm text-muted">No classes yet. Upload a text-based routine PDF. Nothing is filled in for you.</p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {DAY_NAMES.map((day, index) => {
          const rows = slots.filter((s) => s.weekday === index).sort((a, b) => a.start.localeCompare(b.start));
          return (
            <section key={day} className={`glass p-4 ${index === weekdayIndex ? "glow-ring" : ""}`}>
              <h2 className="font-display text-sm font-semibold">{day}{index === weekdayIndex ? " · today" : ""}</h2>
              {rows.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No class recorded.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {rows.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-2">
                      <span>
                        <span className="text-accent">{row.start}–{row.end}</span> {row.subject}
                        {row.room ? <span className="text-muted"> · {row.room}</span> : null}
                      </span>
                      {editing && (
                        <button type="button" className="text-xs text-danger" onClick={() => removeSlot(row.id)}>Remove</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <button type="button" className="text-sm text-primary" onClick={() => setEditing((v) => !v)}>
        {editing ? "Close edit routine" : "Edit routine"}
      </button>
      {editing && (
        <form
          className="glass grid gap-2 p-4 md:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!subject.trim()) return;
            const candidate = [...slots, { weekday, subject, start, end, room }];
            const clash = overlappingPairs(candidate);
            if (clash.length) {
              setNote(clash[0]);
              return;
            }
            addSlot({ weekday, subject: subject.trim(), start, end, room: room.trim() });
            setSubject("");
            setRoom("");
            setNote("Class added. This does not mark it as held or attended.");
          }}
        >
          <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" aria-label="Weekday">
            {DAY_NAMES.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" aria-label="Start" />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" aria-label="End" />
          <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room" className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg md:col-span-5">Add correction</button>
          {note && <p className="text-sm text-muted md:col-span-5">{note}</p>}
        </form>
      )}
    </div>
  );
}
