"use client";

import Link from "next/link";
import { listClaims } from "@/lib/genshield";
import { useAsync } from "@/lib/useAsync";
import { gen, pct, shortAddr, when } from "@/lib/format";
import { Badge, Card, Empty, toneForClaim, toneForVerdict } from "@/components/ui";

export default function ClaimsPage() {
  const { data, error, loading } = useAsync(() => listClaims(), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Claims</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Every claim filed against this contract, and the rounds that decided it. Anyone can
          advance one that has stalled.
        </p>
      </div>

      {error ? (
        <Card className="border-signal-bad/40"><div className="text-sm text-signal-bad">{error}</div></Card>
      ) : null}
      {loading ? <Empty>Loading claims…</Empty> : null}
      {data && data.length === 0 ? <Empty>No claims filed yet.</Empty> : null}

      <div className="space-y-3">
        {data?.map((c) => (
          <Link key={c.id} href={`/claim/${c.id}`}>
            <Card className="transition hover:border-signal-cool/50">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm text-slate-300">Claim #{c.id}</span>
                <Badge tone={toneForClaim(c.state)}>{c.state}</Badge>
                {c.verdict ? <Badge tone={toneForVerdict(c.verdict)}>{c.verdict}</Badge> : null}
                <span className="text-xs text-slate-500">
                  policy #{c.policyId} · {shortAddr(c.claimant)} · {when(c.filedAt)}
                </span>
                <span className="ml-auto font-mono text-xs text-slate-400">
                  {c.state === "SETTLED"
                    ? `${gen(c.payoutAtto)} GEN paid`
                    : c.lossBps !== "0"
                      ? `${pct(c.lossBps)} severity`
                      : ""}
                </span>
              </div>
              {c.rounds.length > 0 ? (
                <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                  {c.rounds[c.rounds.length - 1].reasoning}
                </p>
              ) : null}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
