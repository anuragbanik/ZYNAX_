/** Heuristic extraction from text-based college PDFs. Never invents rows that were not in the text. */

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_INDEX: Record<string, number> = {
  mon: 0, monday: 0,
  tue: 1, tues: 1, tuesday: 1,
  wed: 2, wednesday: 2,
  thu: 3, thur: 3, thurs: 3, thursday: 3,
  fri: 4, friday: 4,
  sat: 5, saturday: 5,
  sun: 6, sunday: 6,
};

export type ParsedSlot = {
  weekday: number;
  subject: string;
  start: string;
  end: string;
  room: string;
  faculty: string;
};

export type ParsedExam = {
  subject: string;
  date: string;
  time: string;
  venue: string;
  uncertain: boolean;
};

export type ParsedAttendance = { subject: string; held: number; attended: number };

export type ParsedChapter = { subject: string; title: string };

export type ParseResult = {
  kind: "timetable" | "exam" | "syllabus" | "attendance" | "notice" | "unknown";
  slots: ParsedSlot[];
  exams: ParsedExam[];
  attendance: ParsedAttendance[];
  chapters: ParsedChapter[];
  warnings: string[];
};

const TIME_RE =
  /(\d{1,2})[:.](\d{2})\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})[:.](\d{2})\s*(am|pm)?/i;

function to24(h: number, m: number, ampm?: string) {
  let hour = h;
  if (ampm) {
    const tag = ampm.toLowerCase();
    if (tag === "pm" && hour < 12) hour += 12;
    if (tag === "am" && hour === 12) hour = 0;
  }
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function classifyKind(text: string, filename: string): ParseResult["kind"] {
  const blob = `${filename} ${text}`.toLowerCase();
  if (/attendance|present|absent/.test(blob) && /\d/.test(blob)) return "attendance";
  if (/exam|mid\s*sem|end\s*sem|date sheet/.test(blob)) return "exam";
  if (/syllabus|unit\s+\d|chapter\s+\d/.test(blob)) return "syllabus";
  if (/timetable|time\s*table|routine|monday|period/.test(blob)) return "timetable";
  if (/notice|circular/.test(blob)) return "notice";
  return "unknown";
}

function splitChunks(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?=(?:mon|tue|wed|thu|fri|sat|sun)(?:day|sday|rsday|nesday)?\b)|(?=unit\s+\d)|(?=chapter\s+\d)|(?=exam\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseCollegeText(text: string, filename = ""): ParseResult {
  const kind = classifyKind(text, filename);
  const warnings: string[] = [];
  const attendance: ParsedAttendance[] = [];
  const exams: ParsedExam[] = [];
  const chapters: ParsedChapter[] = [];

  let rest = text.replace(/\s+/g, " ");
  for (const match of rest.matchAll(/([A-Za-z][A-Za-z0-9 &./-]{2,40}?)\s+attended\s+(\d{1,3})\s+(?:of|out of|\/)\s+(\d{1,3})/gi)) {
    const attended = Number(match[2]);
    const held = Number(match[3]);
    if (attended > held) warnings.push(`${match[1].trim()}: attended is higher than held. Not saved until you fix it.`);
    else attendance.push({ subject: match[1].trim(), held, attended });
    rest = rest.replace(match[0], " ");
  }
  for (const match of rest.matchAll(/(?:exam|mid(?:\s*sem)?|end(?:\s*sem)?)\s*[:\-–]?\s*([A-Za-z][A-Za-z0-9 &./-]{2,40}?)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})(?:\s+(\d{1,2}:\d{2}))?(?:\s+(?:venue|hall|room)\s*[:#-]?\s*([A-Za-z0-9-]+))?/gi)) {
    const date = normalizeDate(match[2]);
    exams.push({
      subject: match[1].trim(),
      date,
      time: match[3] || "",
      venue: match[4] || "",
      uncertain: !date,
    });
    if (!date) warnings.push(`Could not read the exam date in: ${match[0].slice(0, 80)}`);
    rest = rest.replace(match[0], " ");
  }
  for (const match of rest.matchAll(/(?:^|\s)(?:unit|chapter)\s+(\d+)\s*[:.\-–]?\s*([A-Za-z][^.]{2,80})/gi)) {
    chapters.push({ subject: "Unassigned", title: `Unit ${match[1]}: ${match[2].trim()}`.slice(0, 100) });
    rest = rest.replace(match[0], " ");
  }
  if (chapters.length) warnings.push("Chapters are marked Unassigned until you confirm the subject.");

  const slots: ParsedSlot[] = [];
  for (const chunk of rest.split(/(?=(?:mon|tue|wed|thu|fri|sat|sun)(?:day|sday|rsday|nesday)?\b)/i)) {
    const dayMatch = chunk.match(/^(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|sday|rsday|nesday)?\b/i);
    const time = chunk.match(TIME_RE);
    if (!dayMatch || !time) continue;
    const key = dayMatch[1].toLowerCase();
    const weekday = DAY_INDEX[key] ?? DAY_INDEX[key.slice(0, 3)];
    if (weekday == null) continue;
    const start = to24(Number(time[1]), Number(time[2]), time[3]);
    const end = to24(Number(time[4]), Number(time[5]), time[6] || time[3]);
    if (minutes(end) <= minutes(start)) {
      warnings.push(`Skipped a class with end time before start: ${chunk.slice(0, 80)}`);
      continue;
    }
    let subject = chunk.replace(dayMatch[0], "").replace(TIME_RE, " ");
    const roomM = subject.match(/\b(?:room|lab|hall)\s*[:#-]?\s*([A-Za-z0-9-]+)/i);
    const room = roomM?.[1] ?? "";
    subject = subject.replace(roomM?.[0] ?? "", "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!subject) warnings.push("A class had a time but no subject name.");
    slots.push({ weekday, subject: subject || "Untitled class", start, end, room, faculty: "" });
  }

  if (!slots.length && !exams.length && !attendance.length && !chapters.length) {
    warnings.push(
      text.trim()
        ? "No timetable rows, exams, attendance totals, or chapters were detected. The file is saved as a document only. Scanned image PDFs need text; OCR is not available."
        : "This file had no readable text.",
    );
  }

  return { kind, slots: dedupeSlots(slots), exams, attendance, chapters, warnings };
}

function normalizeDate(raw: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (!m) return "";
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = months.indexOf(m[2].slice(0, 3).toLowerCase());
  if (month < 0) return "";
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

export function dedupeSlots(slots: ParsedSlot[]) {
  const seen = new Set<string>();
  const out: ParsedSlot[] = [];
  for (const slot of slots) {
    const key = `${slot.weekday}|${slot.start}|${slot.subject.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(slot);
  }
  return out;
}

export function overlappingPairs(slots: { weekday: number; start: string; end: string; subject: string }[]) {
  const hits: string[] = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.weekday !== b.weekday) continue;
      if (minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end)) {
        hits.push(`${DAY_NAMES[a.weekday]} ${a.start}: ${a.subject} overlaps ${b.subject}`);
      }
    }
  }
  return hits;
}

export function slotDiff(
  current: { weekday: number; start: string; subject: string }[],
  next: { weekday: number; start: string; subject: string }[],
) {
  const key = (s: { weekday: number; start: string; subject: string }) =>
    `${s.weekday}|${s.start}|${s.subject.toLowerCase()}`;
  const oldKeys = new Set(current.map(key));
  const newKeys = new Set(next.map(key));
  return {
    added: next.filter((s) => !oldKeys.has(key(s))).length,
    removed: current.filter((s) => !newKeys.has(key(s))).length,
  };
}

export function planFromChapters(
  chapters: { subject: string; title: string; done: boolean }[],
  hours: number,
) {
  const open = chapters.filter((c) => !c.done);
  const perDay = Math.max(1, Math.min(3, Math.floor(hours) || 1));
  const days: { label: string; tasks: string[] }[] = [];
  for (let i = 0; i < open.length; i += perDay) {
    days.push({
      label: `Day ${days.length + 1}`,
      tasks: open.slice(i, i + perDay).map((c) => `${c.subject}: ${c.title}`.slice(0, 120)),
    });
  }
  return days.slice(0, 14);
}

export function collegeFacts(input: {
  slots: { weekday: number; start: string; end: string; subject: string; room: string }[];
  exams: { subject: string; date: string; time: string; venue: string }[];
  subjects: { name: string; held: number; attended: number }[];
  chapters: { subject: string; title: string; done: boolean }[];
}) {
  const lines = ["Structured records the student approved (not guesses):"];
  if (!input.slots.length && !input.exams.length && !input.subjects.length) {
    lines.push("None yet. Do not invent a timetable, exam date, or attendance figure.");
    return lines.join("\n");
  }
  for (const slot of input.slots.slice(0, 40)) {
    lines.push(`Class: ${DAY_NAMES[slot.weekday]} ${slot.start}-${slot.end} ${slot.subject}${slot.room ? ` room ${slot.room}` : ""}`);
  }
  for (const exam of input.exams) {
    lines.push(`Exam: ${exam.subject} on ${exam.date || "date missing"}${exam.time ? ` at ${exam.time}` : ""}${exam.venue ? ` venue ${exam.venue}` : ""}`);
  }
  for (const subject of input.subjects) {
    lines.push(`Attendance record: ${subject.name} attended ${subject.attended} of ${subject.held} held`);
  }
  const open = input.chapters.filter((c) => !c.done);
  if (open.length) lines.push(`Chapters not marked done: ${open.slice(0, 12).map((c) => c.title).join("; ")}`);
  return lines.join("\n");
}
