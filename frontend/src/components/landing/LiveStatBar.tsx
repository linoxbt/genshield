"use client";

import { getStats } from "@/lib/genshield";
import { useAsync } from "@/lib/useAsync";
import { gen } from "@/lib/format";

/**
 * A thin band of real contract figures. If the read fails it renders
 * nothing rather than showing placeholder numbers as though they were live.
 */
export function LiveStatBar() {
  const { data } = useAsync(() => getStats(), []);
  if (!data) return null;

  const items = [
    `${data.products} products`,
    `${gen(data.capitalAtto)} GEN in the pools`,
    `${gen(data.lockedAtto)} GEN of cover in force`,
    `${gen(data.premiumAtto)} GEN premium earned`,
    `${data.claims} claims filed`,
  ];

  return (
    <section className="border-t border-ink-line bg-ink">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px] text-white/40 tabnum">
        {items.map((text, i) => (
          <span key={text} className="flex items-center gap-6">
            {text}
            {i < items.length - 1 ? <span className="text-white/20">·</span> : null}
          </span>
        ))}
      </div>
    </section>
  );
}
