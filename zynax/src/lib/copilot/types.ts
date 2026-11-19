export type DocPage = { page: number; text: string };

export type CampusDoc = {
  id: string;
  name: string;
  size: number;
  uploadedAt: number;
  pages: DocPage[];
  kind: "pdf" | "sample" | "note";
  warning?: string;
};

export type SourceRef = { name: string; page: number };

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  error?: boolean;
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMsg[];
};

export type Profile = {
  nickname: string;
  college: string;
  branch: string;
  year: string;
  subjects: string;
  interests: string;
  goals: string;
  helpWith: string;
};

export type PlanTask = { id: string; title: string; done: boolean };
export type PlanDay = { label: string; tasks: PlanTask[] };
export type StudyPlan = {
  id: string;
  title: string;
  examDate: string;
  hours: number;
  days: PlanDay[];
  createdAt: number;
  note: string;
};

export type Slot = {
  id: string;
  weekday: number;
  subject: string;
  start: string;
  end: string;
  room: string;
  faculty?: string;
};

export type SubjectRec = {
  id: string;
  name: string;
  code: string;
  faculty: string;
  held: number;
  attended: number;
};

export type ExamRec = {
  id: string;
  subject: string;
  date: string;
  time: string;
  venue: string;
  uncertain: boolean;
};

export type ChapterRec = {
  id: string;
  subject: string;
  title: string;
  done: boolean;
};

export type Flashcard = { front: string; back: string };

export type AskMode = "chat" | "notes" | "quiz" | "plan" | "notice";

export type Chunk = { name: string; page: number; text: string };
