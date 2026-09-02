"use client";

import Link from "next/link";
import { useInView } from "@/lib/useInView";
import { useScrollDepth } from "@/lib/useScrollDepth";
import { DecileBar } from "./DecileBar";
import { MarkWatermark } from "./MarkWatermark";

// Two independent readings of the same incident, both landing in decile 6.
// The numbers differ, as two honest readings always will; the bucket does
// not, which is the whole point.
const LEADER_BPS = 6100;
const VALIDATOR_BPS = 6800;

/**
 * The art-directed section. Desktop and mobile are genuinely different
 * compositions rather than one layout reflowed.
 *
 * The heading gets a real scroll-linked depth of field: it sharpens in once
 * via the one-shot `useInView` reveal, then `.scroll-depth-blur` takes over
 * as the reader keeps scrolling past — a continuous blur, not a second
 * one-shot trigger.
 */
export function ConsensusReveal() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const { ref: depthRef } = useScrollDepth<HTMLHeadingElement>();
  const { ref: depthRefMobile } = useScrollDepth<HTMLHeadingElement>();

  return (
    <section
      ref={ref}

      className="relative w-full min-h-[100dvh] overflow-hidden bg-ink-deep flex flex-col justify-center py-20 md:py-0"
    >
      <MarkWatermark />

      {/* Desktop: headline set against a large right-hand visual */}
      <div className="hidden md:block relative z-10 w-full h-[100dvh]">
        <div className="absolute top-[16%] left-[clamp(1.6rem,3.5vw,13rem)] z-10 max-w-md">
          <span className="text-[0.75vw] uppercase tracking-[0.36em] text-white/40 block mb-4">
            The rule
          </span>
          <h2
            ref={depthRef}
            className={`scroll-depth-blur font-doc uppercase text-white text-[4vw] leading-[0.9] tracking-[0.02em] ${
              inView ? "animate-clause-reveal" : "opacity-0"
            }`}
          >
            Agreement
            <br />
            is the
            <br />
            payout
          </h2>
          <p
            className={`text-[0.95vw] text-white/60 mt-8 max-w-sm leading-relaxed ${
              inView ? "animate-clause-reveal" : "opacity-0"
            }`}
            style={{ animationDelay: inView ? "150ms" : undefined }}
          >
            Two validators read the same claim against the same wording, independently.
            Their raw severity figures never match. What must match is the decile — and
            that agreed decile, not either reading, is what the pool pays.
          </p>
          <Link
            href="/how-it-works"
            className={`inline-block mt-8 font-mono text-xs uppercase tracking-[0.2em] text-white/70 border-b border-white/30 hover:text-white hover:border-white pb-1 transition-colors ${
              inView ? "animate-clause-reveal" : "opacity-0"
            }`}
            style={{ animationDelay: inView ? "300ms" : undefined }}
          >
            See the mechanism →
          </Link>
        </div>

        <div
          className={`absolute right-[clamp(1.6rem,3.5vw,13rem)] top-1/2 -translate-y-1/2 w-[46vw] z-20 ${
            inView ? "animate-clause-reveal" : "opacity-0"
          }`}
          style={{ animationDelay: inView ? "250ms" : undefined }}
        >
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-sm text-white">Severity, as the contract decides it</span>
            <span className="font-mono text-[11px] text-white/40 tabnum">10 buckets</span>
          </div>
          <DecileBar leaderBps={LEADER_BPS} validatorBps={VALIDATOR_BPS} />
        </div>
      </div>

      {/* Mobile: stacked and simplified — not the same DOM reflowed */}
      <div className="md:hidden relative z-10 px-6">
        <span className="text-[11px] uppercase tracking-[0.32em] text-white/40 block mb-4">
          The rule
        </span>
        <h2
          ref={depthRefMobile}
          className={`scroll-depth-blur font-doc uppercase text-white text-[34px] leading-[1.05] tracking-[0.02em] mb-6 ${
            inView ? "animate-clause-reveal" : "opacity-0"
          }`}
        >
          Agreement is the payout
        </h2>
        <p className="text-[15px] text-white/60 leading-relaxed mb-8 max-w-sm">
          Two validators read the same claim independently. Their raw severity figures
          never match; the decile must. That agreed decile is what the pool pays.
        </p>
        <DecileBar leaderBps={LEADER_BPS} validatorBps={VALIDATOR_BPS} size="compact" />
        <Link
          href="/how-it-works"
          className="inline-block mt-8 font-mono text-xs uppercase tracking-[0.2em] text-white/70 border-b border-white/30"
        >
          See the mechanism →
        </Link>
      </div>
    </section>
  );
}
