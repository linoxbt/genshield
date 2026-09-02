"use client";

import Link from "next/link";
import { listProducts } from "@/lib/genshield";
import { useAsync } from "@/lib/useAsync";
import { useScrollSequence } from "@/lib/useScrollSequence";
import { gen, pct, utilisation } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Badge, Meter, toneForReview } from "@/components/ui";

function Panel({
  product,
  index,
  total,
  setPanelRef,
}: {
  product: Product;
  index: number;
  total: number;
  setPanelRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={setPanelRef}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 opacity-0"
    >
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-signal-cool block mb-3">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
      <Badge tone={toneForReview(product.reviewState)}>{product.reviewState}</Badge>

      <Link
        href={`/product/${product.id}`}
        className="font-doc text-3xl sm:text-4xl text-white mt-5 mb-6 hover:text-signal-cool transition-colors"
      >
        {product.name}
      </Link>

      <p className="wording text-sm sm:text-base text-white/55 max-w-2xl leading-relaxed line-clamp-4">
        {product.wording}
      </p>

      <div className="w-full max-w-md mt-8">
        <Meter percent={utilisation(product.lockedAtto, product.capitalAtto)} />
      </div>
      <span className="font-mono text-[11px] text-white/40 tabnum mt-3">
        {gen(product.capitalAtto)} GEN capital · {gen(product.lockedAtto)} GEN in force ·{" "}
        {pct(Number(product.rateBpsPerDay))} per day
      </span>
    </div>
  );
}

/**
 * Live products from the contract, one panel at a time. Reads only — if the
 * contract is unreachable this renders nothing rather than inventing a
 * catalogue, which is the same rule the rest of the app follows.
 */
export function ProductSequence() {
  const { data } = useAsync(() => listProducts(12), []);
  const products = data ?? [];
  const { wrapperRef, panelRefs } = useScrollSequence<HTMLDivElement>(Math.max(1, products.length));

  if (products.length === 0) return null;

  return (
    <section  className="relative w-full bg-ink-deep">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-24 sm:pt-32 pb-10 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 block mb-3">
          Open products
        </span>
        <h2 className="font-doc text-white text-4xl sm:text-5xl">What&rsquo;s underwritten</h2>
      </div>

      <div ref={wrapperRef} className="relative" style={{ height: `${products.length * 100}vh` }}>
        <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
          {products.map((p, i) => (
            <Panel
              key={p.id}
              product={p}
              index={i}
              total={products.length}
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
