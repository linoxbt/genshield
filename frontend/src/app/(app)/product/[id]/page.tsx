"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useAccount } from "wagmi";
import {
  buyPolicy, deposit, getProduct, getQuote, listPolicies, reviewProduct, sharesOf, shareValue, withdraw,
} from "@/lib/genshield";
import { useAsync } from "@/lib/useAsync";
import { gen, pct, shortAddr, toAtto, utilisation, when } from "@/lib/format";
import { Badge, Card, Crumb, Empty, Meter, Stat, toneForReview } from "@/components/ui";
import TxButton from "@/components/TxButton";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { address } = useAccount();

  const { data, error, loading, reload } = useAsync(async () => {
    const [product, policies] = await Promise.all([getProduct(id), listPolicies()]);
    const shares = address ? await sharesOf(id, address) : "0";
    const value = shares !== "0" ? await shareValue(id, shares) : "0";
    return { product, policies: policies.filter((p) => p.productId === id), shares, value };
  }, [id, address]);

  const [cover, setCover] = useState("1");
  const [days, setDays] = useState("30");
  const [quote, setQuote] = useState<string | undefined>();
  const [quoteErr, setQuoteErr] = useState<string | undefined>();
  const [lpAmount, setLpAmount] = useState("1");

  const product = data?.product;

  async function fetchQuote() {
    setQuoteErr(undefined);
    setQuote(undefined);
    try {
      const q = await getQuote(id, toAtto(cover), Number(days));
      setQuote(q.premiumAtto);
    } catch (e) {
      setQuoteErr(e instanceof Error ? e.message : String(e));
    }
  }

  if (loading) return <Empty>Loading product…</Empty>;
  if (error) return <Card className="border-signal-bad/40"><div className="text-sm text-signal-bad">{error}</div></Card>;
  if (!product) return <Empty>No product #{id} on this contract.</Empty>;

  const approved = product.reviewState === "APPROVED";

  return (
    <div className="space-y-8">
      <div>
        <Crumb href="/">← All products</Crumb>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{product.name}</h1>
          <Badge tone={toneForReview(product.reviewState)}>{product.reviewState}</Badge>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Underwriter <span className="font-mono">{shortAddr(product.underwriter)}</span> · opened{" "}
          {when(product.createdAt)}
        </div>
      </div>

      <Card>
        <h2 className="text-sm uppercase tracking-wider text-slate-500">Policy wording</h2>
        <p className="wording mt-3 text-[15px] text-slate-200">{product.wording}</p>

        <div className="mt-5 grid gap-4 border-t border-ink-line pt-4 sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Admissible evidence</div>
            <ul className="mt-1.5 space-y-1">
              {product.evidenceHosts.map((h) => (
                <li key={h} className="font-mono text-xs text-slate-300">{h}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-600">
              Fixed when the product opened. A claimant cannot cite a page they control.
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Insured chain RPC</div>
            <div className="mt-1.5 break-all font-mono text-xs text-slate-300">{product.chainRpc}</div>
          </div>
        </div>
      </Card>

      {product.reviewNote ? (
        <Card className={approved ? "border-signal-ok/30" : "border-signal-bad/30"}>
          <h2 className="text-sm uppercase tracking-wider text-slate-500">
            Underwriting review · consensus round
          </h2>
          <p className="mt-2 text-sm italic leading-relaxed text-slate-300">
            &ldquo;{product.reviewNote}&rdquo;
          </p>
          <p className="mt-3 text-xs text-slate-600">
            Validators judged whether this wording can be settled objectively from the evidence
            above, before any capital stood behind it. A product that fails review can never sell
            a policy.
          </p>
        </Card>
      ) : (
        <Card className="border-signal-warn/30">
          <h2 className="text-sm uppercase tracking-wider text-slate-500">Awaiting review</h2>
          <p className="mt-2 text-sm text-slate-400">
            This product cannot sell cover until a consensus round decides its wording is
            adjudicable. Anyone can trigger it.
          </p>
          <div className="mt-4">
            <TxButton
              label="Run underwriting review"
              pendingLabel="Validators reading the wording…"
              action={(s, onPhase) => reviewProduct(s, id, onPhase)}
              onDone={reload}
            />
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm uppercase tracking-wider text-slate-500">Risk pool</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Stat label="Capital" value={`${gen(product.capitalAtto)} GEN`} />
            <Stat label="Capacity" value={`${gen(product.capacityAtto)} GEN`} sub={`${pct(Number(product.maxLeverageBps))} leverage`} />
            <Stat label="Cover in force" value={`${gen(product.lockedAtto)} GEN`} />
            <Stat label="Premium earned" value={`${gen(product.premiumAtto)} GEN`} />
          </div>
          <div className="mt-4">
            <Meter percent={utilisation(product.lockedAtto, product.capitalAtto)} label="Utilisation" />
          </div>

          <div className="mt-6 border-t border-ink-line pt-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Provide liquidity</div>
            <p className="mt-1.5 text-xs text-slate-600">
              Shares are minted against the pool&apos;s current value, so a payout dilutes every LP
              at the moment it happens.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-xs text-slate-500">
                Amount (GEN)
                <input
                  value={lpAmount}
                  onChange={(e) => setLpAmount(e.target.value)}
                  className="mt-1 block w-32 rounded border border-ink-line bg-ink px-2 py-1.5 font-mono text-sm text-slate-100"
                />
              </label>
              <TxButton
                label="Deposit"
                action={(s, onPhase) => deposit(s, id, toAtto(lpAmount), onPhase)}
                onDone={reload}
                variant="ghost"
              />
            </div>
            {data && data.shares !== "0" ? (
              <div className="mt-4 flex flex-wrap items-end gap-3 text-xs text-slate-400">
                <span>
                  You hold <span className="font-mono">{gen(data.shares)}</span> shares, worth{" "}
                  <span className="font-mono">{gen(data.value)} GEN</span>
                </span>
                <TxButton
                  label="Withdraw all"
                  action={(s, onPhase) => withdraw(s, id, BigInt(data.shares), onPhase)}
                  reconcile={async () => {
                    // The withdrawal transfer executes at finalization, so the
                    // remaining share balance is only trustworthy now.
                    const left = address ? await sharesOf(id, address) : "0";
                    return `Withdrawn. ${gen(left)} shares remaining.`;
                  }}
                  onDone={reload}
                  variant="ghost"
                  hint="Blocked while capital backs live cover."
                />
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm uppercase tracking-wider text-slate-500">Buy cover</h2>
          {!approved ? (
            <p className="mt-3 text-sm text-slate-500">
              This product is {product.reviewState.toLowerCase()} and cannot sell cover.
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-3">
                <label className="text-xs text-slate-500">
                  Cover (GEN)
                  <input
                    value={cover}
                    onChange={(e) => { setCover(e.target.value); setQuote(undefined); }}
                    className="mt-1 block w-32 rounded border border-ink-line bg-ink px-2 py-1.5 font-mono text-sm text-slate-100"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Days
                  <input
                    value={days}
                    onChange={(e) => { setDays(e.target.value); setQuote(undefined); }}
                    className="mt-1 block w-24 rounded border border-ink-line bg-ink px-2 py-1.5 font-mono text-sm text-slate-100"
                  />
                </label>
                <button
                  onClick={fetchQuote}
                  className="mt-5 h-[34px] rounded border border-ink-line bg-ink-soft px-3 text-sm text-slate-200 hover:border-signal-cool"
                >
                  Get quote
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-600">
                Priced deterministically: {pct(Number(product.rateBpsPerDay))} per day of cover,
                plus a surcharge that rises with pool utilisation. Cover must be between{" "}
                {gen(product.minCoverageAtto)} and {gen(product.maxCoverageAtto)} GEN.
              </p>

              {quoteErr ? (
                <div className="mt-3 rounded border border-signal-bad/40 bg-signal-bad/10 p-2 text-xs text-signal-bad">
                  {quoteErr}
                </div>
              ) : null}

              {quote ? (
                <div className="mt-4 rounded border border-ink-line bg-ink p-4">
                  <Stat label="Premium" value={`${gen(quote)} GEN`} sub={`for ${gen(toAtto(cover))} GEN of cover over ${days} days`} />
                  <div className="mt-4">
                    <TxButton
                      label="Buy policy"
                      action={(s, onPhase) =>
                        buyPolicy(s, id, toAtto(cover), Number(days), BigInt(quote), onPhase)
                      }
                      reconcile={async () => {
                        // Any overpayment is refunded on finalization, so the
                        // premium actually charged is read back, not assumed.
                        const p = await getProduct(id);
                        return p
                          ? `Cover is live. Pool now holds ${gen(p.capitalAtto)} GEN with ${gen(p.lockedAtto)} GEN reserved.`
                          : undefined;
                      }}
                      onDone={reload}
                      hint="Any overpayment is refunded on finalisation."
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-slate-500">Policies on this product</h2>
        {data && data.policies.length === 0 ? (
          <Empty>No cover written yet.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data?.policies.map((p) => (
              <Link key={p.id} href={`/policy/${p.id}`}>
                <Card className="transition hover:border-signal-cool/50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-slate-300">Policy #{p.id}</span>
                    <Badge tone={p.state === "ACTIVE" ? "ok" : p.state === "CLAIMED" ? "cool" : "mute"}>
                      {p.state}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Stat label="Cover" value={`${gen(p.coverageAtto)}`} sub="GEN" />
                    <Stat label="Expires" value={<span className="text-sm">{when(p.expiresAt)}</span>} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
