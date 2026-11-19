import assert from "node:assert/strict";
import test from "node:test";
import { attendanceMath } from "./math.ts";
import { overlappingPairs, parseCollegeText, slotDiff } from "./college.ts";

test("attendance uses floor(A/T - H) and ceil recovery", () => {
  const row = attendanceMath(100, 80, 0.75);
  assert.equal(row.percentage, 80);
  assert.equal(row.safeToMiss, 6);
  assert.equal(row.classesNeeded, 0);
  const low = attendanceMath(10, 6, 0.75);
  assert.equal(low.classesNeeded, 6);
  assert.equal(low.safeToMiss, 0);
  assert.equal(attendanceMath(0, 0).percentage, 0);
});

test("parser reads timetable, exam, attendance, and chapter lines", () => {
  const text = `
    Monday 09:00-10:00 Data Structures Room 210
    Monday 09:30-10:30 Operating Systems Room 211
    Physics attended 28 of 40
    Exam: Mathematics 2026-11-20 10:00 Hall A
    Unit 2: Stacks and queues
  `;
  const parsed = parseCollegeText(text, "routine.pdf");
  assert.equal(parsed.slots.length, 2);
  assert.equal(parsed.slots[0].subject.includes("Data Structures"), true);
  assert.equal(parsed.attendance[0].held, 40);
  assert.equal(parsed.attendance[0].attended, 28);
  assert.equal(parsed.exams[0].date, "2026-11-20");
  assert.equal(parsed.chapters.length, 1);
  assert.equal(overlappingPairs(parsed.slots).length, 1);
});

test("slot diff does not treat unchanged classes as new", () => {
  const current = [{ weekday: 0, start: "09:00", subject: "Physics" }];
  const next = [
    { weekday: 0, start: "09:00", subject: "Physics" },
    { weekday: 1, start: "11:00", subject: "Maths" },
  ];
  assert.deepEqual(slotDiff(current, next), { added: 1, removed: 0 });
});
