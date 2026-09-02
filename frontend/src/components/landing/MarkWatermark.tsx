"use client";

import { useEffect, useState } from "react";
import { Mark } from "@/components/Logo";

const ROTATION_MS = 4200;

/**
 * The oversized, slowly-turning backdrop behind the reveal section: the
 * mark, then the three consensus rounds as numerals. Each layer crossfades
 * with its own scale and rotation coming in and a different one going out,
 * so it reads as one turning away while the next arrives rather than a flat
 * dissolve. A tint sits between this and the real content — light enough
 * that the layer still shows through.
 */
const NUMERALS = ["I", "II", "III"];

export function MarkWatermark() {
  const [active, setActive] = useState(0);
  const total = NUMERALS.length + 1; // + the mark itself

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((v) => (v + 1) % total), ROTATION_MS);
    return () => window.clearInterval(id);
  }, [total]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <Layer isActive={active === 0}>
        <Mark size={620} />
      </Layer>

      {NUMERALS.map((n, i) => (
        <Layer key={n} isActive={active === i + 1}>
          <span
            className="font-doc text-[46vw] leading-none text-transparent select-none"
            style={{ WebkitTextStroke: "1px var(--ink-line)" }}
          >
            {n}
          </span>
        </Layer>
      ))}

      <div className="absolute inset-0 bg-ink-deep/70" />
    </div>
  );
}

function Layer({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center transition-all ease-[cubic-bezier(0.16,1,0.3,1)] duration-[1400ms]"
      style={{
        opacity: isActive ? 0.5 : 0,
        transform: isActive ? "scale(1) rotate(0deg)" : "scale(1.35) rotate(18deg)",
      }}
    >
      {children}
    </div>
  );
}
