import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CampusDoc, ChapterRec, ChatThread, ExamRec, Flashcard, Profile, Slot, StudyPlan, SubjectRec } from "./types";
import { SAMPLE_DOC_ID, sampleSyllabus } from "./sample";

const emptyProfile: Profile = {
  nickname: "",
  college: "",
  branch: "",
  year: "",
  subjects: "",
  interests: "",
  goals: "",
  helpWith: "",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type State = {
  theme: "dark" | "light";
  profile: Profile;
  docs: CampusDoc[];
  threads: ChatThread[];
  activeThreadId: string | null;
  plans: StudyPlan[];
  slots: Slot[];
  flashcards: Flashcard[];
  loggedIn: boolean;
  attendance: { held: number; attended: number };
  attendanceTarget: number;
  subjects: SubjectRec[];
  exams: ExamRec[];
  chapters: ChapterRec[];
  pendingOtp: { email: string; code: string; name: string; branch: string; section: string } | null;
  session: { email: string; section: string } | null;
  setTheme: (theme: "dark" | "light") => void;
  setProfile: (profile: Profile) => void;
  addDoc: (doc: CampusDoc) => void;
  removeDoc: (id: string) => void;
  loadSample: () => void;
  ensureThread: () => string;
  newThread: () => string;
  appendMessage: (threadId: string, message: ChatThread["messages"][number]) => void;
  savePlan: (plan: StudyPlan) => void;
  toggleTask: (planId: string, taskId: string) => void;
  removePlan: (id: string) => void;
  addSlot: (slot: Omit<Slot, "id">) => void;
  removeSlot: (id: string) => void;
  setFlashcards: (cards: Flashcard[]) => void;
  requestOtp: (input: { name: string; email: string; branch: string; section: string }) => string;
  verifyOtp: (code: string) => boolean;
  logout: () => void;
  setAttendance: (held: number, attended: number) => void;
  setAttendanceTarget: (target: number) => void;
  setSubjects: (subjects: SubjectRec[]) => void;
  setSubjectTotals: (id: string, held: number, attended: number) => void;
  setExams: (exams: ExamRec[]) => void;
  setChapters: (chapters: ChapterRec[]) => void;
  toggleChapter: (id: string) => void;
  replaceSlots: (slots: Omit<Slot, "id">[]) => void;
};

export const useCopilot = create<State>()(
  persist(
    (set, get) => ({
      theme: "dark",
      profile: emptyProfile,
      docs: [],
      threads: [],
      activeThreadId: null,
      plans: [],
      slots: [],
      flashcards: [],
      loggedIn: false,
      attendance: { held: 0, attended: 0 },
      attendanceTarget: 0.75,
      subjects: [],
      exams: [],
      chapters: [],
      pendingOtp: null,
      session: null,
      setTheme: (theme) => set({ theme }),
      setProfile: (profile) => set({ profile }),
      addDoc: (doc) =>
        set((s) => ({
          docs: [doc, ...s.docs.filter((d) => d.id !== doc.id)].slice(0, 8),
        })),
      removeDoc: (id) => set((s) => ({ docs: s.docs.filter((d) => d.id !== id) })),
      loadSample: () => {
        const sample = sampleSyllabus();
        set((s) => ({ docs: [sample, ...s.docs.filter((d) => d.id !== SAMPLE_DOC_ID)].slice(0, 8) }));
      },
      ensureThread: () => {
        const current = get().activeThreadId;
        if (current && get().threads.some((t) => t.id === current)) return current;
        return get().newThread();
      },
      newThread: () => {
        const id = uid();
        const thread: ChatThread = {
          id,
          title: "New chat",
          updatedAt: Date.now(),
          messages: [],
        };
        set((s) => ({ threads: [thread, ...s.threads].slice(0, 20), activeThreadId: id }));
        return id;
      },
      appendMessage: (threadId, message) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const title =
              t.messages.length === 0 && message.role === "user"
                ? message.content.slice(0, 48)
                : t.title;
            return { ...t, title, updatedAt: Date.now(), messages: [...t.messages, message] };
          }),
        })),
      savePlan: (plan) => set((s) => ({ plans: [plan, ...s.plans].slice(0, 6) })),
      toggleTask: (planId, taskId) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id !== planId
              ? p
              : {
                  ...p,
                  days: p.days.map((d) => ({
                    ...d,
                    tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
                  })),
                },
          ),
        })),
      removePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
      addSlot: (slot) => set((s) => ({ slots: [...s.slots, { ...slot, id: uid() }] })),
      removeSlot: (id) => set((s) => ({ slots: s.slots.filter((x) => x.id !== id) })),
      setFlashcards: (flashcards) => set({ flashcards }),
      requestOtp: (input) => {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        set({
          pendingOtp: {
            email: input.email.trim().toLowerCase(),
            code,
            name: input.name.trim(),
            branch: input.branch.trim(),
            section: input.section.trim().toUpperCase(),
          },
        });
        return code;
      },
      verifyOtp: (code) => {
        const pending = get().pendingOtp;
        if (!pending || pending.code !== code.trim()) return false;
        set((s) => ({
          loggedIn: true,
          pendingOtp: null,
          session: { email: pending.email, section: pending.section },
          profile: {
            ...s.profile,
            nickname: pending.name,
            branch: pending.branch,
          },
        }));
        return true;
      },
      logout: () => set({ loggedIn: false, pendingOtp: null, session: null }),
      setAttendance: (held, attended) =>
        set({
          attendance: {
            held: Math.max(0, Math.floor(held)),
            attended: Math.max(0, Math.floor(attended)),
          },
        }),
      setAttendanceTarget: (target) => set({ attendanceTarget: Math.min(0.99, Math.max(0.5, target)) }),
      setSubjects: (subjects) => set({ subjects }),
      setSubjectTotals: (id, held, attended) =>
        set((s) => ({
          subjects: s.subjects.map((row) =>
            row.id === id ? { ...row, held: Math.max(0, held), attended: Math.max(0, Math.min(held, attended)) } : row,
          ),
        })),
      setExams: (exams) => set({ exams }),
      setChapters: (chapters) => set({ chapters }),
      toggleChapter: (id) =>
        set((s) => ({ chapters: s.chapters.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) })),
      replaceSlots: (slots) => set({ slots: slots.map((slot) => ({ ...slot, id: uid() })) }),
    }),
    { name: "campus-copilot-v1" },
  ),
);

export function newId() {
  return uid();
}

export function profileBlurb(profile: Profile) {
  const bits = [
    profile.nickname && `Name: ${profile.nickname}`,
    profile.college && `College: ${profile.college}`,
    profile.branch && `Branch: ${profile.branch}`,
    profile.year && `Year: ${profile.year}`,
    profile.subjects && `Subjects: ${profile.subjects}`,
    profile.interests && `Interests: ${profile.interests}`,
    profile.goals && `Goals: ${profile.goals}`,
    profile.helpWith && `Needs help with: ${profile.helpWith}`,
  ].filter(Boolean);
  return bits.join(". ");
}
