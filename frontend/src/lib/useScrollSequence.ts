"use client";

import { useEffect, useRef } from "react";

const EDGE_FRACTION = 0.12;

/**
 * Drives the sticky-pinned scroll sequences: a tall (N x 100vh) wrapper with
 * a pinned viewport inside it, showing one panel at a time as the user
 * scrolls through.
 *
 * Writes inline style directly rather than going through React state, so
 * scrolling never triggers a re-render. Progress through the wrapper is
 * measured the same way a CSS "cover" range would be — 0 when its top
 * reaches the viewport bottom, 1 when its bottom leaves the viewport top —
 * then split into `count` equal segments, with each panel fading and
 * settling in and out inside its own segment.
 */
export function useScrollSequence<T extends HTMLElement>(count: number) {
  const wrapperRef = useRef<T | null>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Don't tie visibility to scroll position at all — just show them.
      panelRefs.current.forEach((panel) => {
        if (panel) {
          panel.style.opacity = "1";
          panel.style.transform = "none";
        }
      });
      return;
    }

    let ticking = false;

    function update() {
      ticking = false;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const total = rect.height + viewportHeight;
      const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / total));
      const segment = 1 / count;

      panelRefs.current.forEach((panel, i) => {
        if (!panel) return;
        const local = (progress - i * segment) / segment;
        let opacity = 0;
        if (local >= 0 && local <= 1) {
          if (local < EDGE_FRACTION) opacity = local / EDGE_FRACTION;
          else if (local > 1 - EDGE_FRACTION) opacity = (1 - local) / EDGE_FRACTION;
          else opacity = 1;
        }
        panel.style.opacity = String(opacity);
        panel.style.transform = `translateY(${24 * (1 - opacity)}px) scale(${0.92 + 0.08 * opacity})`;
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count]);

  return { wrapperRef, panelRefs };
}
