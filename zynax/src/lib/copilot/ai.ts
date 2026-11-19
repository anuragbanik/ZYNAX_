import { createServerFn } from "@tanstack/react-start";
import type { AskMode, Chunk } from "./types";

export type AskInput = {
  mode: AskMode;
  question: string;
  profile: string;
  chunks: Chunk[];
};

const MODES: AskMode[] = ["chat", "notes", "quiz", "plan", "notice"];

function clampText(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export const aiStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { configured: Boolean(process.env.XAI_API_KEY) };
});

export const askCopilot = createServerFn({ method: "POST" })
  .validator((input: AskInput) => {
    const mode = MODES.includes(input?.mode) ? input.mode : "chat";
    const question = clampText(input?.question, 4000).trim();
    if (!question) throw new Error("Write a question or task first.");
    const profile = clampText(input?.profile, 800);
    const chunks: Chunk[] = [];
    let budget = 9000;
    for (const raw of Array.isArray(input?.chunks) ? input.chunks.slice(0, 6) : []) {
      const text = clampText(raw?.text, 1800);
      if (!text || budget <= 0) continue;
      const slice = text.slice(0, budget);
      budget -= slice.length;
      chunks.push({
        name: clampText(raw?.name, 180) || "Document",
        page: Number.isFinite(raw?.page) ? Math.max(1, Math.floor(raw.page)) : 1,
        text: slice,
      });
    }
    return { mode, question, profile, chunks };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI is not available in this environment." };
    }

    const excerpt =
      data.chunks.length === 0
        ? "DOCUMENT EXCERPTS: none. The student has not provided matching document text for this question."
        : data.chunks
            .map((c, i) => `[${i + 1}] ${c.name}, page ${c.page}\n${c.text}`)
            .join("\n\n");

    const format =
      data.mode === "quiz"
        ? `Return ONLY JSON: {"questions":[{"prompt":"","choices":["","","",""],"answer":0,"explanation":"","source":""}]} with 4 questions. Each explanation must say whether the fact came from a document excerpt. If excerpts are empty, say you cannot quiz the documents and return {"questions":[],"reason":"..."}.`
        : data.mode === "plan"
          ? `Return ONLY JSON: {"title":"","note":"Plans are suggestions, not a guarantee of marks.","days":[{"label":"","tasks":["task"]}]} with 5 to 7 days. Do not invent official exam dates that are not in the excerpts or the student message.`
          : data.mode === "notes"
            ? `Return ONLY JSON: {"summary":"","concepts":[""],"flashcards":[{"front":"","back":""}]} . Mark any claim that is not in the excerpts as general knowledge.`
            : data.mode === "notice"
              ? `Extract action items that are actually written in the excerpts. Return markdown. If a date is not in the text, do not invent one. End with a line: Verify important dates with your college.`
              : `Answer in markdown. Start document-backed facts with "From your documents:". Cite like [filename, p. N]. If the excerpts do not contain the answer, say "I don't see this in your uploaded documents." You may then add a short section titled "General suggestion (not from your documents)". Never invent fees, rules, rooms, or deadlines.`;

    const system = `You are ZYNAX, a study assistant for college students.
Never invent official college rules, deadlines, fees, rooms, or syllabus topics.
Student profile (optional, may be blank): ${data.profile || "not provided"}
${format}`;

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: data.mode === "chat" ? 0.4 : 0.2,
          max_tokens: data.mode === "quiz" || data.mode === "plan" ? 1200 : 800,
          messages: [
            { role: "system", content: system },
            { role: "user", content: `${excerpt}\n\nSTUDENT REQUEST:\n${data.question}` },
          ],
        }),
      });
      if (res.status === 402) {
        return {
          ok: false as const,
          error: "The AI provider has no remaining quota right now (HTTP 402). Your documents were still searched. Try again when the key has credit.",
        };
      }
      if (!res.ok) {
        return { ok: false as const, error: `The AI service returned ${res.status}. Try again in a moment.` };
      }
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) return { ok: false as const, error: "The model returned an empty answer." };
      return { ok: true as const, text };
    } catch {
      return { ok: false as const, error: "Could not reach the AI service." };
    }
  });
