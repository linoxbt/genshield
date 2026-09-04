"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useAccount } from "wagmi";
import { fileClaim, getPolicy, getProduct, listClaims, releaseExpired } from "@/lib/genshield";
import { useAsync } from "@/lib/useAsync";
import { gen, shortAddr, toAtto, when } from "@/lib/format";
import { Badge, Card, Crumb, Empty, Stat, toneForClaim } from "@/components/ui";
import TxButton from "@/components/TxButton";

export default function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { address } = useAccount();

  const { data, error, loading, reload } = useAsync(async () => {
    const policy = await getPolicy(id);
    if (!policy) return { policy: undefined };
    const [product, claims] = await Promise.all([getProduct(policy.productId), listClaims()]);
    return { policy, product, claims: claims.filter((c) => c.policyId === id) };
  }, [id]);

  const [urls, setUrls] = useState("");
  const [hashes, setHashes] = useState("");
  const [bond, setBond] = useState("0.01");

  if (loading) return <Empty>Loading policy…</Empty>;
  if (error) return <Card className="border-signal-bad/40"><div className="text-sm text-signal-bad">{error}</div></Card>;
  if (!data?.policy) return <Empty>No policy #{id} on this contract.</Empty>;

  const { policy, product, claims } = data;
  const isHolder = address?.toLowerCase() === policy.holder.toLowerCase();
  const expired = Number(policy.expiresAt) * 1000 < Date.now();
  const urlList = urls.split(/[\s,]+/).filter(Boolean);
  const hashList = hashes.split(/[\s,]+/).filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <Crumb href={product ? `/product/${product.id}` : "/"}>← {product?.name ?? "Product"}</Crumb>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Policy #{policy.id}</h1>
          <Badge tone={policy.state === "ACTIVE" ? "ok" : policy.state === "CLAIMED" ? "cool" : "mute"}>
            {policy.state}
          </Badge>
          {expired && policy.state === "ACTIVE" ? <Badge tone="warn">lapsed</Badge> : null}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Holder <span className="font-mono">{shortAddr(policy.holder)}</span>
          {isHolder ? " · you" : ""}
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Sum insured" value={`${gen(policy.coverageAtto)} GEN`} />
          <Stat label="Premium paid" value={`${gen(policy.premiumPaidAtto)} GEN`} />
          <Stat label="Cover from" value={<span className="text-sm">{when(policy.startsAt)}</span>} />
          <Stat label="Cover to" value={<span className="text-sm">{when(policy.expiresAt)}</span>} />
        </div>
      </Card>

      {product ? (
        <Card>
          <h2 className="text-sm uppercase tracking-wider text-slate-500">What this covers</h2>
          <p className="wording mt-3 text-[15px] text-slate-200">{product.wording}</p>
          <div className="mt-4 border-t border-ink-line pt-3 text-xs text-slate-500">
            Evidence must come from:{" "}
            <span className="font-mono text-slate-300">{product.evidenceHosts.join(", ")}</span>
          </div>
        </Card>
      ) : null}

      {policy.state === "ACTIVE" && !expired ? (
        <Card>
          <h2 className="text-sm uppercase tracking-wider text-slate-500">File a claim</h2>
          <p className="mt-2 text-xs text-slate-600">
            Cite the reporting that evidences the loss, and any transaction hashes on the insured
            chain. The contract fetches both itself. Filing takes a bond, returned in full if the
            claim is paid.
          </p>

          <div className="mt-4 space-y-3">
            <label className="block text-xs text-slate-500">
              Evidence URLs (one per line)
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={3}
                placeholder={product ? `https://${product.evidenceHosts[0]}/…` : ""}
                className="mt-1 block w-full rounded border border-ink-line bg-ink px-2 py-1.5 font-mono text-xs text-slate-100"
              />
            </label>
            <label className="block text-xs text-slate-500">
              Transaction hashes on the insured chain (optional, one per line)
              <textarea
                value={hashes}
                onChange={(e) => setHashes(e.target.value)}
                rows={2}
                placeholder="0x…"
                className="mt-1 block w-full rounded border border-ink-line bg-ink px-2 py-1.5 font-mono text-xs text-slate-100"
              />
            </label>
            <label className="block text-xs text-slate-500">
              Filing bond (GEN)
              <input
                value={bond}
                onChange={(e) => setBond(e.target.value)}
                className="mt-1 block w-32 rounded border border-ink-line bg-ink px-2 py-1.5 font-mono text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="mt-4">
            <TxButton
              label="File claim"
              action={(s, onPhase) => fileClaim(s, id, urlList, hashList, toAtto(bond), onPhase)}
              onDone={reload}
              disabled={!isHolder || urlList.length === 0}
              hint={!isHolder ? "Only the policyholder can claim." : undefined}
            />
          </div>
        </Card>
      ) : null}

      {policy.state === "ACTIVE" && expired ? (
        <Card className="border-signal-warn/30">
          <h2 className="text-sm uppercase tracking-wider text-slate-500">Cover has lapsed</h2>
          <p className="mt-2 text-xs text-slate-600">
            Releasing it frees the capital standing behind this policy so LPs can withdraw it
            again. Permissionless.
          </p>
          <div className="mt-4">
            <TxButton label="Release cover" action={(s, onPhase) => releaseExpired(s, id, onPhase)} onDone={reload} variant="ghost" />
          </div>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-slate-500">Claims</h2>
        {claims && claims.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {claims.map((c) => (
              <Link key={c.id} href={`/claim/${c.id}`}>
                <Card className="transition hover:border-signal-cool/50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-slate-300">Claim #{c.id}</span>
                    <Badge tone={toneForClaim(c.state)}>{c.state}</Badge>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">Filed {when(c.filedAt)}</div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Empty>No claims filed against this policy.</Empty>
        )}
      </section>
    </div>
  );
}
