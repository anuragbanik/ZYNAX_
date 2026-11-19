import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { askCopilot } from "@/lib/copilot/ai";
import { retrieve } from "@/lib/copilot/retrieve";
import { collegeFacts } from "@/lib/copilot/college";
import { newId, profileBlurb, useCopilot } from "@/lib/copilot/store";

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

const CHIPS = [
  "Explain my syllabus",
  "Find important exam topics",
  "Find my assignment deadline",
  "What is in Unit 2?",
];

function ChatPage() {
  const docs = useCopilot((s) => s.docs);
  const slots = useCopilot((s) => s.slots);
  const exams = useCopilot((s) => s.exams);
  const subjects = useCopilot((s) => s.subjects);
  const chapters = useCopilot((s) => s.chapters);
  const threads = useCopilot((s) => s.threads);
  const activeId = useCopilot((s) => s.activeThreadId);
  const profile = useCopilot((s) => s.profile);
  const ensureThread = useCopilot((s) => s.ensureThread);
  const newThread = useCopilot((s) => s.newThread);
  const appendMessage = useCopilot((s) => s.appendMessage);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThreadId(activeId ?? ensureThread());
  }, [activeId, ensureThread]);

  const thread = threads.find((t) => t.id === threadId);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [thread?.messages.length, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy || !threadId) return;
    setDraft("");
    appendMessage(threadId, { id: newId(), role: "user", content: question });
    setBusy(true);
    const chunks = retrieve(docs, question);
    try {
      const res = await askCopilot({
        data: {
          mode: "chat",
          question,
          profile: `${profileBlurb(profile)}\n${collegeFacts({ slots, exams, subjects, chapters })}`,
          chunks,
        },
      });
      if (!res.ok) {
        appendMessage(threadId, { id: newId(), role: "assistant", content: res.error, error: true });
      } else {
        appendMessage(threadId, {
          id: newId(),
          role: "assistant",
          content: res.text,
          sources: chunks.map((c) => ({ name: c.name, page: c.page })),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      appendMessage(threadId, { id: newId(), role: "assistant", content: message, error: true });
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Bestie AI</h1>
          <p className="text-sm text-muted">{docs.length ? `${docs.length} document(s) in this browser` : "No documents yet — answers will say so."}</p>
        </div>
        <button className="rounded-full border border-border px-3 py-2 text-sm" onClick={() => setThreadId(newThread())}>
          New chat
        </button>
      </div>
      <div ref={scroller} className="glass min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {!thread?.messages.length && (
          <div className="text-sm text-muted">
            Ask about a document you uploaded. Suggested prompts only fill the box — they are not answers.
            <div className="mt-3 flex flex-wrap gap-2">
              {CHIPS.map((chip) => (
                <button key={chip} className="rounded-full bg-surface-2 px-3 py-2 text-xs text-fg" onClick={() => setDraft(chip)}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
        {thread?.messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "ml-auto max-w-[90%]" : "max-w-[95%]"}>
            <div className={`rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-fg" : "bg-surface-2"} ${msg.error ? "border border-danger" : ""}`}>
              {msg.role === "assistant" ? <Markdown text={msg.content} /> : <p className="text-sm">{msg.content}</p>}
            </div>
            {msg.role === "assistant" && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <button onClick={() => copy(msg.content)}>Copy</button>
                {msg.sources && msg.sources.length > 0 && <span>Searched {msg.sources.length} page match(es)</span>}
                {msg.error && (
                  <button onClick={() => send(thread.messages.filter((m) => m.role === "user").at(-1)?.content ?? "")}>Retry</button>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="text-sm text-muted">ZYNAX is reading…</div>}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          rows={2}
          placeholder="Ask about your syllabus, notes, or a deadline…"
          className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface px-3 py-2 text-sm outline-none"
        />
        <button disabled={busy || !draft.trim()} className="rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-fg disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
