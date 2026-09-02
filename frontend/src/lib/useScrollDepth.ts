"use client";

import { useEffect, useRef } from "react";

const MAX_BLUR_PX = 14;

/**
 * JS fallback for the `.scroll-depth-blur` class in globals.css (native
 * `animation-timeline: view()`), active only where that isn't supported.
 * Writes `style.filter` directly rather than through state so scrolling
 * never re-renders, and no-ops under prefers-reduced-motion — it bypasses
 * the CSS-only blanket override by writing the property imperatively.
 */
export function useScrollDepth<T extends HTMLElement>(maxBlurPx = MAX_BLUR_PX) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline", "view()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;

    function update() {
      ticking = false;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      // Mirrors the CSS `exit` range: sharp until the element starts leaving
      // past the top of the viewport, then blurring as it goes.
      const exited = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      node.style.filter = exited <= 0 ? "" : `blur(${(exited * maxBlurPx).toFixed(1)}px)`;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (node) node.style.filter = "";
    };
  }, [maxBlurPx]);

  return { ref };
}
