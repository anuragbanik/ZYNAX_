/** Deterministic attendance maths from the original design (FR-7). Never delegated to the model. */
export function attendanceMath(held: number, attended: number, threshold = 0.75) {
  if (held <= 0) return { percentage: 0, safeToMiss: 0, classesNeeded: 0 };
  const percentage = Math.round((attended / held) * 10000) / 100;
  const safeToMiss = Math.max(0, Math.floor(attended / threshold - held));
  let classesNeeded = 0;
  if (attended / held < threshold && threshold < 1) {
    classesNeeded = Math.max(0, Math.ceil((threshold * held - attended) / (1 - threshold)));
  }
  return { percentage, safeToMiss, classesNeeded };
}

export function sgpa(rows: { credits: number; grade: number }[]) {
  let credits = 0;
  let points = 0;
  for (const row of rows) {
    if (row.credits <= 0) continue;
    credits += row.credits;
    points += row.credits * row.grade;
  }
  if (!credits) return null;
  return Math.round((points / credits) * 100) / 100;
}
