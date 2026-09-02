"use client";

import { useEffect, useState } from "react";

/**
 * Whether the page has scrolled away from the top.
 *
 * This replaces a light/dark tone scrollspy borrowed from a reference design
 * that has two registers to switch between. GenShield has one: every surface
 * is dark. What the header actually needs is not a tone but a background —
 * transparent while it floats over the hero, solid once content is passing
 * underneath it.
 *
 * Keeping the header permanently `fixed` also removes a real bug. Switching
 * between `fixed` and `sticky` mid-scroll changes whether the header occupies
 * layout space, so content jumped and the bar overlapped the section beneath
 * it at the moment of the switch.
 */
export function useScrolled(threshold = 40): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    function update() {
      ticking = false;
      setScrolled(window.scrollY > threshold);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
