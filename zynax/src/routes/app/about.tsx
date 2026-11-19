import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { aiStatus } from "@/lib/copilot/ai";
import { attendanceMath, sgpa } from "@/lib/copilot/math";
import { useCopilot } from "@/lib/copilot/store";
import type { Profile } from "@/lib/copilot/types";

export const Route = createFileRoute("/app/about")({
  component: AboutPage,
});

function AboutPage() {
  const profile = useCopilot((s) => s.profile);
  const setProfile = useCopilot((s) => s.setProfile);
  const theme = useCopilot((s) => s.theme);
  const setTheme = useCopilot((s) => s.setTheme);
  const [held, setHeld] = useState(20);
  const [form, setForm] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);
  const [ai, setAi] = useState<string>("Checking AI…");
  const target = useCopilot((s) => s.attendanceTarget ?? 0.75);
  const setAttendanceTarget = useCopilot((s) => s.setAttendanceTarget);
  const [attended, setAttended] = useState(16);
  const [rows, setRows] = useState([
    { credits: 4, grade: 8 },
    { credits: 3, grade: 9 },
  ]);

  useEffect(() => {
    void aiStatus()
      .then((res) => setAi(res.configured ? "AI provider is configured on the server." : "AI provider is not configured in this environment."))
      .catch(() => setAi("Could not check the AI provider."));
  }, []);

  const att = attendanceMath(held, attended, target);
  const gpa = sgpa(rows);

  function field(key: keyof Profile, label: string) {
    return (
      <label className="block text-sm">
        {label}
        <input
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2"
        />
      </label>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My Era <span className="text-sm font-normal text-muted">· settings</span></h1>
        <p className="text-sm text-muted">Made by Anurag Banik. The product name is ZYNAX.</p>
      </div>

      <section className="glass space-y-3 p-4">
        <h2 className="font-display font-semibold">Student profile</h2>
        <p className="text-sm text-muted">Everything here is optional and stays in this browser.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {field("nickname", "Name or nickname")}
          {field("college", "College")}
          {field("branch", "Branch")}
          {field("year", "Semester or year")}
          {field("subjects", "Subjects")}
          {field("interests", "Interests")}
          {field("goals", "Goals")}
          {field("helpWith", "Where you need help")}
        </div>
        <button
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
          onClick={() => {
            setProfile(form);
            setSaved(true);
          }}
        >
          Save profile
        </button>
        {saved && <p className="text-sm text-accent">Saved on this device.</p>}
      </section>

      <section className="glass flex items-center justify-between p-4">
        <div>
          <h2 className="font-display font-semibold">Theme</h2>
          <p className="text-sm text-muted">Dark is the default presentation look.</p>
        </div>
        <button
          className="rounded-full border border-border px-4 py-2 text-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          Switch to {theme === "dark" ? "light" : "dark"}
        </button>
      </section>

      <section className="glass p-4">
        <h2 className="font-display font-semibold">Attendance calculator</h2>
        <p className="text-sm text-muted">Target is {Math.round(target * 100)}%. Safe-to-miss is floor(attended / target − held), never a guess.</p>
        <label className="mt-2 block text-sm">
          Target percent
          <input
            type="number"
            min={50}
            max={99}
            value={Math.round(target * 100)}
            onChange={(e) => setAttendanceTarget(Number(e.target.value) / 100)}
            className="ml-2 w-20 rounded-xl border border-border bg-bg px-3 py-2"
          />
        </label>
        <div className="mt-3 flex gap-2">
          <input type="number" min={0} value={held} onChange={(e) => setHeld(Number(e.target.value))} className="w-28 rounded-xl border border-border bg-bg px-3 py-2" aria-label="Classes held" />
          <input type="number" min={0} value={attended} onChange={(e) => setAttended(Number(e.target.value))} className="w-28 rounded-xl border border-border bg-bg px-3 py-2" aria-label="Classes attended" />
        </div>
        <p className="mt-3 text-sm">{att.percentage}% · safe to miss {att.safeToMiss} · need {att.classesNeeded} more to recover</p>
      </section>

      <section className="glass p-4">
        <h2 className="font-display font-semibold">SGPA</h2>
        {rows.map((row, i) => (
          <div key={i} className="mt-2 flex gap-2">
            <input type="number" value={row.credits} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, credits: Number(e.target.value) } : r)))} className="w-24 rounded-xl border border-border bg-bg px-3 py-2" aria-label="Credits" />
            <input type="number" value={row.grade} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, grade: Number(e.target.value) } : r)))} className="w-24 rounded-xl border border-border bg-bg px-3 py-2" aria-label="Grade point" />
          </div>
        ))}
        <button className="mt-2 text-sm text-primary" onClick={() => setRows([...rows, { credits: 3, grade: 8 }])}>Add subject</button>
        <p className="mt-2 font-semibold">SGPA: {gpa ?? "—"}</p>
      </section>

      <section className="glass space-y-2 p-4 text-sm text-muted">
        <h2 className="font-display font-semibold text-fg">What this app does</h2>
        <p>{ai}</p>
        <p>Documents and chats stay in local browser storage. They are not a shared college database. Important dates should be verified with the institution.</p>
        <p>AI calls run on the server with the platform key. The key is never sent to the browser.</p>
        <p>Made by Anurag Banik.</p>
      </section>
    </div>
  );
}
