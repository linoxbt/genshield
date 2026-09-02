"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Full-viewport masthead: centred, uppercase, wide-tracked display text at
 * fluid vw sizing, fading in shortly after mount in three staggered beats
 * rather than all at once.
 */
export function Hero() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section

      className="relative w-full h-[100dvh] overflow-hidden bg-ink flex flex-col"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(120%_90%_at_50%_0%,_var(--ink-blue)_0%,_var(--ink-deep)_45%,_var(--ink)_100%)] opacity-90"
        aria-hidden="true"
      />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-28 sm:pt-32 md:pt-[9vw] px-6 text-center">
        <span
          className={`text-[11px] md:text-[0.85vw] uppercase tracking-[0.36em] text-white/40 mb-6 transition-opacity duration-700 ${
            revealed ? "opacity-100" : "opacity-0"
          }`}
        >
          Insurance on GenLayer
        </span>

        <h1
          className={`uppercase text-white font-normal cursor-default select-none text-[28px] leading-[1.2] tracking-[0.14em] md:text-[3vw] md:leading-[1.15] md:tracking-[0.18em] max-w-5xl transition-opacity duration-1000 delay-150 ${
            revealed ? "opacity-100" : "opacity-0"
          }`}
        >
          Cover written in plain language.
          <br />
          Settled without an adjudicator.
        </h1>

        <div
          className={`mt-10 flex flex-wrap items-center justify-center gap-4 transition-opacity duration-700 delay-500 ${
            revealed ? "opacity-100" : "opacity-0"
          }`}
        >
          <Link
            href="/products"
            className="font-mono text-xs uppercase tracking-[0.2em] px-6 py-3 border border-white/40 text-white hover:bg-signal-cool hover:text-ink hover:border-signal-cool transition-colors"
          >
            Browse products
          </Link>
          <Link
            href="/how-it-works"
            className="font-mono text-xs uppercase tracking-[0.2em] px-6 py-3 text-white/50 hover:text-white transition-colors"
          >
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}
