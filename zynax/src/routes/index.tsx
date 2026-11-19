import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCopilot } from "@/lib/copilot/store";

export const Route = createFileRoute("/")({
  component: Landing,
});

const LAYERS = [
  { kicker: "01", title: "One tab. Whole campus.", text: "Syllabus, notices, and your timetable stop living in five different chats." },
  { kicker: "02", title: "Receipts included", text: "Ask about Unit 2. If the PDF does not say it, ZYNAX says so. No cap." },
  { kicker: "03", title: "Your day, no cap", text: "Pull-up score, the next class, and what is actually due, on the first screen." },
];

/** The tools, under their Gen Z names. Used by the slider, the flip cards and the 3D orbit. */
const TOOLS = [
  { icon: "✅", name: "Pull Up", real: "Attendance", text: "Tap + after every class. See exactly how many you can skip and stay safe.", c1: "#8b5cf6", c2: "#22d3ee" },
  { icon: "🗓️", name: "Daily Grind", real: "Timetable", text: "Your routine PDF turns into a clean week. Overlaps get flagged.", c1: "#e879f9", c2: "#8b5cf6" },
  { icon: "🤖", name: "Bestie AI", real: "AI chat", text: "Ask about your own PDFs. If the page is not there, it tells you straight.", c1: "#22d3ee", c2: "#3b82f6" },
  { icon: "🧠", name: "Brain Dump", real: "Smart notes", text: "Turn any chapter into quick notes you can actually revise from.", c1: "#fbbf24", c2: "#e879f9" },
  { icon: "⚔️", name: "Boss Battle", real: "Quiz lab", text: "Flashcards and quizzes from your syllabus. Beat the exam before it beats you.", c1: "#fb7185", c2: "#8b5cf6" },
  { icon: "📚", name: "The Stash", real: "College PDFs", text: "Every syllabus, notice and routine, saved on your device and searchable.", c1: "#34d399", c2: "#22d3ee" },
] as const;

function Landing() {
  const navigate = useNavigate();
  const loggedIn = useCopilot((s) => s.loggedIn);
  const requestOtp = useCopilot((s) => s.requestOtp);
  const verifyOtp = useCopilot((s) => s.verifyOtp);
  const pending = useCopilot((s) => s.pendingOtp);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branch, setBranch] = useState("");
  const [section, setSection] = useState("");
  const [code, setCode] = useState("");
  const [shown, setShown] = useState("");
  const [error, setError] = useState("");

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.includes("@") || !branch.trim() || !section.trim()) {
      setError("Name, college email, branch, and section are required.");
      return;
    }
    const otp = requestOtp({ name, email, branch, section });
    setShown(otp);
    setStep("otp");
    setError("");
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyOtp(code)) {
      setError("That code does not match. Use the preview code shown above.");
      return;
    }
    navigate({ to: "/app" });
  }

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  useEffect(() => {
    const root = document.getElementById("landing-sections");
    if (!root) return;
    let x = 0;
    let y = 0;
    let active = false;
    function start(event: TouchEvent) {
      if (event.touches.length !== 1) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, button, a, label, [data-no-swipe]")) return;
      x = event.touches[0].clientX;
      y = event.touches[0].clientY;
      active = true;
    }
    function end(event: TouchEvent) {
      if (!active) return;
      active = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - x;
      const dy = touch.clientY - y;
      if (Math.abs(dx) < 64 && Math.abs(dy) < 80) return;
      const goingForward = Math.abs(dx) > Math.abs(dy) ? dx < 0 : dy < 0;
      document.getElementById(goingForward ? "enter" : "top")?.scrollIntoView({ behavior: "smooth" });
    }
    root.addEventListener("touchstart", start, { passive: true });
    root.addEventListener("touchend", end, { passive: true });
    return () => {
      root.removeEventListener("touchstart", start);
      root.removeEventListener("touchend", end);
    };
  }, []);

  return (
    <div id="landing-sections" className="aurora relative min-h-screen overflow-x-hidden text-fg">
      <header className="sticky top-0 z-30 mx-auto flex max-w-6xl items-center justify-between px-5 py-4 backdrop-blur-md">
        <div className="font-display text-base font-semibold tracking-wide text-gradient">ZYNAX</div>
        <a href="#enter" className="btn-neon min-h-11 px-5 py-2.5 text-sm">
          {loggedIn ? "Back in the app" : "Join the squad"}
        </a>
      </header>

      {/* ---------- HERO: text + 3D scene ---------- */}
      <section id="top" className="relative mx-auto grid max-w-6xl items-center gap-6 px-5 pb-16 pt-6 md:grid-cols-2 md:pt-10">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#22D3EE]">Main character energy · AI powered</p>
          <h1 className="font-display mt-3 text-5xl font-semibold leading-[1.04] md:text-6xl lg:text-7xl">
            Your Campus.
            <br />
            <span className="text-gradient-wide">Your Intelligence.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            An AI desk for attendance, your timetable, study plans, and answers grounded in the college files you upload.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#enter" className="btn-neon min-h-12 px-7 py-3 text-base">
              Let’s cook
            </a>
            <a href="#drops" className="min-h-12 rounded-full border border-white/15 px-6 py-3 text-base text-fg backdrop-blur hover:border-[#A78BFA]">
              Show me the vibe
            </a>
          </div>
          <p className="mt-6 text-sm text-muted">Made by Anurag Banik</p>
        </div>
        <Scene3D />
        <div className="grid-floor" aria-hidden="true" />
      </section>

      {/* ---------- stacked 3D feature cards ---------- */}
      <div id="features" className="relative mx-auto max-w-3xl px-5 pb-16">
        {LAYERS.map((layer, i) => (
          <article
            key={layer.kicker}
            className="layer-card sticky top-24 mb-6 p-8"
            style={{ zIndex: i + 1, transform: `translateY(${i * 8}px)` }}
          >
            <div className="text-xs font-semibold tracking-[0.2em]" style={{ color: ["#22D3EE", "#E879F9", "#FBBF24"][i] }}>
              {layer.kicker}
            </div>
            <h2 className="font-display mt-2 text-3xl font-semibold md:text-4xl">{layer.title}</h2>
            <p className="mt-3 max-w-md text-muted">{layer.text}</p>
            <div className="layer-slab" aria-hidden="true" />
          </article>
        ))}
      </div>

      {/* ---------- SLIDER ---------- */}
      <section id="drops" className="mx-auto max-w-6xl px-5 pb-14">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E879F9]">Fresh drops</p>
        <h2 className="font-display mt-2 text-3xl font-semibold md:text-4xl">
          Swipe the <span className="text-gradient-wide">squad tools</span>
        </h2>
        <Slider />
      </section>

      {/* ---------- 3D TOOLKIT ---------- */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#22D3EE]">3D toolkit</p>
        <h2 className="font-display mt-2 text-3xl font-semibold md:text-4xl">
          Tap a card. <span className="text-gradient-wide">Flip the tea.</span>
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          {TOOLS.map((t) => (
            <FlipCard key={t.name} tool={t} />
          ))}
        </div>
        <div className="orbit3d mt-10" aria-hidden="true">
          <div className="orbit3d-ring">
            {TOOLS.map((t, i) => (
              <div key={t.name} className="orbit3d-panel" style={{ "--i": i, background: `linear-gradient(145deg, ${t.c1}cc, ${t.c2}88)` } as React.CSSProperties}>
                <span className="text-3xl">{t.icon}</span>
                <span className="mt-1 text-[11px] font-semibold">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- login ---------- */}
      <section id="enter" className="mx-auto grid max-w-6xl gap-6 px-5 pb-28 md:grid-cols-2">
        <TiltCard className="neon-card p-6">
          <h2 className="font-display text-2xl font-semibold">
            Join the <span className="text-gradient">squad</span>
          </h2>
          <p className="mt-2 text-sm text-muted">
            Email delivery is not connected in this preview, so the code is shown here. Enter it to continue. It stays on this device.
          </p>
          {step === "form" ? (
            <form className="mt-5 space-y-3" onSubmit={send}>
              <Field label="Full name" value={name} onChange={setName} />
              <Field label="College email" value={email} onChange={setEmail} type="email" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Branch" value={branch} onChange={setBranch} />
                <Field label="Section" value={section} onChange={setSection} />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button className="btn-neon min-h-12 w-full text-base">Send me the code</button>
            </form>
          ) : (
            <form className="mt-5 space-y-3" onSubmit={verify}>
              <p className="rounded-2xl border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-4 py-3 text-sm">
                Preview code for {pending?.email}: <strong className="font-display text-lg tracking-widest text-[#22D3EE]">{shown}</strong>
              </p>
              <Field label="Enter OTP" value={code} onChange={setCode} />
              {error && <p className="text-sm text-danger">{error}</p>}
              <button className="btn-neon min-h-12 w-full text-base">Let me in</button>
              <button type="button" className="min-h-11 w-full text-sm text-muted" onClick={() => setStep("form")}>
                Use a different email
              </button>
            </form>
          )}
        </TiltCard>
        <TiltCard className="neon-card flex flex-col justify-end p-6">
          <p className="text-sm text-[#22D3EE]">After you’re in</p>
          <p className="font-display mt-2 text-4xl font-semibold leading-tight">
            <span className="text-gradient-wide">WELCOME</span>
            <br />
            on the first screen.
          </p>
          <p className="mt-3 text-sm text-muted">Attendance sits beside it. Nothing is invented until you type the numbers.</p>
        </TiltCard>
      </section>
    </div>
  );
}

/** Auto-sliding, swipeable carousel (CSS scroll-snap). Pauses while touched or hovered. */
function Slider() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((i: number) => {
    const el = ref.current;
    if (!el) return;
    const n = TOOLS.length;
    const next = ((i % n) + n) % n;
    const slide = el.children[next] as HTMLElement | undefined;
    if (slide) el.scrollTo({ left: slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2, behavior: "smooth" });
    setIndex(next);
  }, []);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setIndex(best);
  }

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => goTo(index + 1), 3800);
    return () => window.clearInterval(t);
  }, [paused, index, goTo]);

  return (
    <div className="mt-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
      <div ref={ref} onScroll={onScroll} data-no-swipe className="slider" aria-label="ZYNAX tools slider">
        {TOOLS.map((t) => (
          <article key={t.name} className="slide" style={{ background: `linear-gradient(145deg, ${t.c1}, ${t.c2})` }}>
            <div className="slide-emoji">{t.icon}</div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-white/70">{t.real}</p>
            <h3 className="font-display mt-1 text-3xl font-semibold text-white">{t.name}</h3>
            <p className="mt-2 text-sm text-white/85">{t.text}</p>
          </article>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex">
          {TOOLS.map((t, i) => (
            <button key={t.name} type="button" aria-label={`Go to ${t.name}`} onClick={() => goTo(i)} className="grid size-6 place-items-center">
              <span className={`block h-2 rounded-full transition-all ${i === index ? "w-6 bg-[#A78BFA]" : "w-2 bg-white/25"}`} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous" onClick={() => goTo(index - 1)} className="size-11 rounded-full border border-white/15 text-lg">
            ←
          </button>
          <button type="button" aria-label="Next" onClick={() => goTo(index + 1)} className="btn-neon size-11 text-lg">
            →
          </button>
        </div>
      </div>
    </div>
  );
}

/** 3D flip card: hover on desktop, tap or press Enter anywhere. */
function FlipCard({ tool }: { tool: (typeof TOOLS)[number] }) {
  const [on, setOn] = useState(false);
  return (
    <button type="button" onClick={() => setOn((v) => !v)} aria-pressed={on} className={`flip ${on ? "on" : ""}`}>
      <span className="flip-in">
        <span className="flip-f" style={{ background: `linear-gradient(145deg, ${tool.c1}55, ${tool.c2}33)` }}>
          <span className="text-4xl">{tool.icon}</span>
          <span className="font-display mt-2 text-lg font-semibold">{tool.name}</span>
          <span className="text-[11px] text-muted">{tool.real}</span>
        </span>
        <span className="flip-b" style={{ background: `linear-gradient(145deg, ${tool.c1}, ${tool.c2})` }}>
          <span className="text-sm leading-snug text-white">{tool.text}</span>
        </span>
      </span>
    </button>
  );
}

/** Pure-CSS 3D scene: spinning glass cube, counter-rotating core, orbit rings and floating orbs. */
function Scene3D() {
  const faces = ["Z", "Y", "N", "A", "X", "✦"];
  return (
    <div className="scene3d relative z-10 mx-auto" aria-hidden="true">
      <div className="orbit-wrap">
        <div className="ring ring-a" />
        <div className="ring ring-b" />
        <div className="cube">
          {faces.map((f, i) => (
            <div key={f} className={`face face-${i + 1}`}>
              {f}
            </div>
          ))}
          <div className="core" />
        </div>
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>
    </div>
  );
}

/** Card that tilts toward the mouse with a moving glare. Touch and keyboard users get a flat card. */
function TiltCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ref.current.style.setProperty("--ry", `${(px - 0.5) * 10}deg`);
    ref.current.style.setProperty("--rx", `${(0.5 - py) * 10}deg`);
    ref.current.style.setProperty("--mx", `${px * 100}%`);
    ref.current.style.setProperty("--my", `${py * 100}%`);
  }
  function leave() {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  }
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`tilt ${className}`}>
      <div className="tilt-glare" aria-hidden="true" />
      <div className="relative">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-neon mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 outline-none"
      />
    </label>
  );
}
