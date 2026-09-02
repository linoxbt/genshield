"use client";

import Link from "next/link";
import { getStats, listProducts } from "@/lib/genshield";
import { isConfigured } from "@/lib/genlayerConfig";
import { useAsync } from "@/lib/useAsync";
import { gen, pct, utilisation } from "@/lib/format";
import { Badge, Card, Empty, Meter, Stat, toneForReview } from "@/components/ui";

export default function ProductsPage() {
  const { data, error, loading } = useAsync(async () => {
    const [stats, products] = await Promise.all([getStats(), listProducts()]);
    return { stats, products };
  }, []);

  return (
    <div className="space-y-10">
      <section className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">Coverage products</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Each product is a policy wording, the hosts whose reporting counts as evidence, and
          a risk pool standing behind it. A product cannot sell cover until a consensus round
          finds its wording adjudicable.
        </p>
      </section>

      {!isConfigured() ? (
        <Card className="border-signal-warn/40">
          <div className="text-sm text-signal-warn">
            No contract address configured. Set{" "}
            <code className="font-mono">NEXT_PUBLIC_GENSHIELD_ADDRESS_STUDIO</code>.
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-signal-bad/40">
          <div className="text-sm text-signal-bad">Could not reach the contract: {error}</div>
        </Card>
      ) : null}

      {data ? (
        <Card>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Products" value={data.stats.products} />
            <Stat label="Policies" value={data.stats.policies} />
            <Stat label="Claims" value={data.stats.claims} />
            <Stat label="Pool capital" value={`${gen(data.stats.capitalAtto)} GEN`} />
            <Stat label="Cover in force" value={`${gen(data.stats.lockedAtto)} GEN`} />
            <Stat label="Premium earned" value={`${gen(data.stats.premiumAtto)} GEN`} />
          </div>
        </Card>
      ) : null}

      <section className="space-y-4">

        {loading ? <Empty>Loading products…</Empty> : null}
        {data && data.products.length === 0 ? (
          <Empty>
            No products yet. <Link href="/underwrite" className="text-signal-cool">Open one</Link>.
          </Empty>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {data?.products.map((p) => (
            <Link key={p.id} href={`/product/${p.id}`}>
              <Card className="h-full transition hover:border-signal-cool/50">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium text-slate-100">{p.name}</h3>
                  <Badge tone={toneForReview(p.reviewState)}>{p.reviewState}</Badge>
                </div>

                <p className="wording mt-3 line-clamp-3 text-sm text-slate-400">{p.wording}</p>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <Stat label="Capital" value={`${gen(p.capitalAtto)}`} sub="GEN" />
                  <Stat label="Capacity" value={`${gen(p.capacityAtto)}`} sub="GEN" />
                  <Stat label="Rate" value={pct(Number(p.rateBpsPerDay))} sub="per day" />
                </div>

                <div className="mt-4">
                  <Meter
                    percent={utilisation(p.lockedAtto, p.capitalAtto)}
                    label={`${gen(p.lockedAtto)} GEN of cover in force`}
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
