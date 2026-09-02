"use client";

import { useScrollSequence } from "@/lib/useScrollSequence";

/**
 * The three consensus rounds, one panel at a time in a sticky-pinned scroll
 * sequence. These are the real rounds the contract runs, in order, each with
 * the primitive it actually uses — not a generic "how it works" list.
 */
const ROUNDS = [
  {
    primitive: "run_nondet_unsafe",
    title: "Can this wording be settled at all?",
    body:
      "Before a single policy is sold, validators judge whether the coverage wording could be decided objectively from the evidence the underwriter nominated. Wording that turns on an unquantified threshold, or on someone's intent, fails here — and a product that fails can never sell cover.",
  },
  {
    primitive: "strict_eq",
    title: "What do the chain facts say?",
    body:
      "The contract queries the insured chain's own RPC and strips each receipt to fields two honest nodes cannot disagree about. That snapshot is frozen onto the claim before any judgment happens, so the round that reads the wording cannot quietly re-derive different facts alongside its verdict.",
  },
  {
    primitive: "run_nondet_unsafe",
    title: "Does the wording cover it?",
    body:
      "Each validator refetches the evidence and forms its own reading — never inspecting the leader's answer for plausibility. Agreement needs an exact verdict match and the same severity decile. Anything less and the round rotates rather than paying.",
  },
];

function Panel({
  round,
  index,
  setPanelRef,
}: {
  round: (typeof ROUNDS)[number];
  index: number;
  setPanelRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={setPanelRef}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 opacity-0"
    >
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-signal-cool block mb-3">
        {String(index + 1).padStart(2, "0")} / {String(ROUNDS.length).padStart(2, "0")}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40 block mb-6">
        {round.primitive}
      </span>
      <h3 className="font-doc text-3xl sm:text-5xl text-white mb-6 max-w-3xl leading-tight">
        {round.title}
      </h3>
      <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-xl">{round.body}</p>
    </div>
  );
}

export function RoundsSequence() {
  const { wrapperRef, panelRefs } = useScrollSequence<HTMLDivElement>(ROUNDS.length);

  return (
    <section  className="relative w-full bg-ink">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-24 sm:pt-32 pb-10 text-center">
        <span className="text-[11px] md:text-[0.75vw] uppercase tracking-[0.36em] text-white/40 block mb-3">
          Three rounds
        </span>
        <h2 className="font-doc uppercase text-white text-[28px] md:text-[2.5vw] leading-tight tracking-[0.02em]">
          Nobody resolves anything
        </h2>
      </div>

      <div ref={wrapperRef} className="relative" style={{ height: `${ROUNDS.length * 100}vh` }}>
        <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
          >
            <span
              className="font-doc text-[22vw] leading-none whitespace-nowrap text-transparent opacity-50"
              style={{ WebkitTextStroke: "1px var(--ink-line)" }}
            >
              GENSHIELD
            </span>
          </div>

          {ROUNDS.map((r, i) => (
            <Panel
              key={r.title}
              round={r}
              index={i}
              setPanelRef={(el) => {
                panelRefs.current[i] = el;
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
