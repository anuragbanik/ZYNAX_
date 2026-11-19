# ZYNAX

Your Campus. Your Intelligence.

ZYNAX is a student productivity app for college life: timetable import, attendance estimates, study checklists, notes, quizzes, and document-grounded questions.

Made by Anurag Banik.

## What stays on this device

Login (name, college email, branch, section, and the one-time code), uploaded PDF text, timetable, attendance totals, and study plans are stored in the browser. The one-time code is shown on the login screen because email delivery is not connected. Closing the browser does not send push alerts.

## Run it

```bash
npm install
npm run dev
```

Open the URL printed by the dev server.

Replit: import this folder as the repository root, then use the Run button. `.replit` starts `npm run dev`.

## Production

```bash
npm run build
```

`npm run build` skips the database step when `DATABASE_URL` is empty.

## Environment variables

Copy `.env.example` to `.env` locally, or set the same names in Vercel. Do not commit real keys.

| Name | Required | Purpose |
| --- | --- | --- |
| `XAI_API_KEY` | No | Enables AI chat, notes, quizzes, and generated study plans |
| `DATABASE_URL` | No | Hosted Postgres. Student data does not depend on it |

## GitHub

1. Create an empty repository.
2. Upload or push **this folder** (the one that contains `package.json`). Do not upload `node_modules`.
3. Confirm `.gitignore` is included so `.env` is never committed.

## Vercel

1. Import the GitHub repository.
2. Framework preset: Vite (or Other). Build command: `npm run build`. Output is produced by Vite / Nitro; leave the install command as `npm install`.
3. Add `XAI_API_KEY` if you want AI answers. Leave `DATABASE_URL` empty unless you attach Postgres.
4. Deploy. The free plan can run the site. AI calls use your own key quota.

## Mobile

On a phone, swipe left or right on a page to move to the next or previous section. Swipe up at the bottom of a page, or down at the top, does the same. Swipes that start on a button, link, or form field are ignored so scrolling and typing still work.

## What's new in this version

- Mobile layout uses a fixed bottom navigation bar (Today, Routine, Attend, Setup, More) instead of the slide-out drawer. Desktop keeps the sidebar.
- New **Attendance** page: add or upload subjects, then use the + / − counters and Present / Absent buttons.
- New login page: aurora colours, a 3D spinning cube scene, a moving perspective grid floor and tilt-on-hover cards. It is pure CSS, so there are no extra packages.
- Front page: a swipeable, auto-sliding "squad tools" carousel, 3D flip cards and a spinning 3D orbit of tools.
- Gen Z page names (the original name is shown small underneath in the sidebar and the More sheet): Vibe Check (Today), Daily Grind (Timetable), Pull Up (Attendance), Lock In (College Setup), Bestie AI (AI Chat), The Stash (College PDFs), Study Arc (Study Planner), Brain Dump (Smart Notes), Boss Battle (Quiz Lab), Showtime (Presentation Demo), My Era (Settings / About).
