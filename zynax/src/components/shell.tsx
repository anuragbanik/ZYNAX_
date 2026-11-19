import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarCheck2,
  CalendarDays,
  Clock3,
  FileText,
  FlaskConical,
  Home,
  LayoutGrid,
  LogOut,
  MessageSquare,
  NotebookPen,
  Presentation,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCopilot } from "@/lib/copilot/store";
import { useSectionSwipe } from "@/lib/use-section-swipe";

/**
 * `primary: true` items get a slot in the bottom bar. Everything else lives in the "More" sheet,
 * so every page the old drawer had is still one tap away.
 */
const NAV = [
  { to: "/app", label: "Vibe Check", short: "Vibes", hint: "Today", icon: Home, exact: true, primary: true },
  { to: "/app/timetable", label: "Daily Grind", short: "Grind", hint: "Timetable", icon: Clock3, primary: true },
  { to: "/app/attendance", label: "Pull Up", short: "Pull Up", hint: "Attendance", icon: CalendarCheck2, primary: true },
  { to: "/app/setup", label: "Lock In", short: "Lock In", hint: "College setup", icon: Sparkles, primary: true },
  { to: "/app/chat", label: "Bestie AI", short: "Bestie", hint: "AI chat", icon: MessageSquare },
  { to: "/app/pdfs", label: "The Stash", short: "Stash", hint: "College PDFs", icon: FileText },
  { to: "/app/study", label: "Study Arc", short: "Arc", hint: "Study planner", icon: CalendarDays },
  { to: "/app/notes", label: "Brain Dump", short: "Dump", hint: "Smart notes", icon: NotebookPen },
  { to: "/app/quiz", label: "Boss Battle", short: "Battle", hint: "Quiz lab", icon: FlaskConical },
  { to: "/app/demo", label: "Showtime", short: "Show", hint: "Presentation demo", icon: Presentation },
  { to: "/app/about", label: "My Era", short: "Era", hint: "Settings / About", icon: Settings },
] as const;

type NavItem = (typeof NAV)[number];

const PRIMARY = NAV.filter((item) => "primary" in item && item.primary);
const MORE = NAV.filter((item) => !("primary" in item && item.primary));
const SECTION_ROUTES = NAV.map((item) => item.to);

function isActive(item: NavItem, path: string) {
  return "exact" in item && item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const theme = useCopilot((s) => s.theme);
  const logout = useCopilot((s) => s.logout);
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Close the "More" sheet whenever the page changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  useSectionSwipe(SECTION_ROUTES, path, (to) => navigate({ to: to as NavItem["to"] }));

  const moreActive = MORE.some((item) => isActive(item, path));
  const moreLit = moreOpen || moreActive;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="flex min-h-screen">
        {/* Desktop sidebar (md and up). Mobile uses the bottom bar instead of a drawer. */}
        <aside
          className={`sticky top-0 hidden h-screen flex-col border-r border-border bg-surface md:flex ${
            collapsed ? "w-20" : "w-64"
          }`}
        >
          <div className="px-4 py-4">
            <Link to="/app" className="block min-w-0">
              <div className="font-display text-sm font-semibold tracking-tight text-gradient">ZYNAX</div>
              {!collapsed && <div className="text-xs text-muted">Your Campus. Your Intelligence.</div>}
            </Link>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
            {NAV.map((item) => {
              const active = isActive(item, path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                    active ? "bg-surface-2 text-fg glow-ring" : "text-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  <Icon className={`size-4 shrink-0 ${active ? "text-[#A78BFA]" : ""}`} />
                  {!collapsed && (
                    <span className="leading-tight">
                      {item.label}
                      <span className="block text-[10px] text-muted">{item.hint}</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border px-4 py-3 text-xs text-muted">
            Made by Anurag Banik
            <button
              className="mt-2 block text-left text-xs text-primary"
              onClick={() => {
                logout();
                navigate({ to: "/" });
              }}
            >
              Log out
            </button>
            <button className="mt-2 block text-left text-xs text-primary" onClick={() => setCollapsed((v) => !v)}>
              {collapsed ? "Expand" : "Collapse"}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header: logo only, no menu toggle. */}
          <header className="pt-safe sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur md:hidden">
            <Link to="/app" className="flex items-baseline gap-2 px-4 py-3">
              <span className="font-display text-base font-semibold tracking-tight text-gradient">ZYNAX</span>
              <span className="text-[11px] text-muted">Your Campus. Your Intelligence.</span>
            </Link>
          </header>

          {/* pb-24 (+ safe area) keeps the last cards clear of the fixed bottom bar on mobile. */}
          <main
            id="app-sections"
            className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:px-8 md:pb-10"
          >
            {children}
          </main>
        </div>
      </div>

      {/* "More" sheet: the rest of the old drawer items. */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="More pages">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close more pages"
            onClick={() => setMoreOpen(false)}
          />
          <div className="sheet-up pb-safe absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-surface">
            <div className="flex items-center justify-between px-5 pt-4">
              <h2 className="font-display text-base font-semibold">More</h2>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full text-muted"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 px-4 py-4">
              {MORE.map((item) => {
                const active = isActive(item, path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center text-xs font-medium ${
                      active
                        ? "border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#A78BFA]"
                        : "border-border bg-surface-2 text-fg"
                    }`}
                  >
                    <Icon className="size-5" />
                    <span className="leading-tight">
                      {item.label}
                      <span className="mt-0.5 block text-[10px] font-normal text-muted">{item.hint}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-muted"
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="size-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent bottom navigation (mobile / small viewports). */}
      <nav aria-label="Primary" className="bottom-nav pb-safe fixed inset-x-0 bottom-0 z-50 md:hidden">
        <ul className="grid grid-cols-5">
          {PRIMARY.map((item) => {
            const active = isActive(item, path) && !moreOpen;
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className="relative flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 py-2 active:scale-95"
                >
                  {active && (
                    <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6]" />
                  )}
                  <span
                    className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                      active ? "nav-pill-active text-white" : "text-muted"
                    }`}
                  >
                    <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
                  </span>
                  <span className={`text-[11px] leading-none font-medium ${active ? "text-[#A78BFA]" : "text-muted"}`}>
                    {item.short}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className="relative flex min-h-[60px] w-full flex-col items-center justify-center gap-1 px-1 py-2 active:scale-95"
            >
              {moreLit && (
                <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6]" />
              )}
              <span
                className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                  moreLit ? "nav-pill-active text-white" : "text-muted"
                }`}
              >
                <LayoutGrid className="size-[18px]" strokeWidth={moreLit ? 2.4 : 2} />
              </span>
              <span className={`text-[11px] leading-none font-medium ${moreLit ? "text-[#A78BFA]" : "text-muted"}`}>
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
