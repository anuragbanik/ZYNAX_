import { useEffect } from "react";

/** Touch swipe between app sections. Vertical swipes only move sections at the scroll edge so normal scrolling still works. */
export function useSectionSwipe(routes: readonly string[], current: string, go: (to: string) => void) {
  useEffect(() => {
    const root = document.getElementById("app-sections");
    if (!root) return;
    let x = 0;
    let y = 0;
    let active = false;

    function start(event: TouchEvent) {
      if (event.touches.length !== 1) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, label, [data-no-swipe]")) return;
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
      const index = routes.findIndex((route) => current === route || (route !== "/app" && current.startsWith(`${route}/`)));
      if (index < 0) return;
      let step = 0;
      if (Math.abs(dx) >= 64 && Math.abs(dx) > Math.abs(dy)) step = dx < 0 ? 1 : -1;
      else if (Math.abs(dy) >= 88 && Math.abs(dy) > Math.abs(dx)) {
        const scroller = document.scrollingElement;
        const top = scroller?.scrollTop ?? 0;
        const height = scroller?.scrollHeight ?? 0;
        const atTop = top <= 12;
        const atBottom = top + window.innerHeight >= height - 16;
        if (dy < 0 && atBottom) step = 1;
        if (dy > 0 && atTop) step = -1;
      }
      const next = routes[index + step];
      if (step && next) go(next);
    }

    root.addEventListener("touchstart", start, { passive: true });
    root.addEventListener("touchend", end, { passive: true });
    return () => {
      root.removeEventListener("touchstart", start);
      root.removeEventListener("touchend", end);
    };
  }, [routes, current, go]);
}
