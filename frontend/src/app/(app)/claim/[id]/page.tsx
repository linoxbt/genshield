"use client";

import { use, useState } from "react";
import {
  adjudicate, appeal, attachChainEvidence, getClaim, getPolicy, getProduct, settle,
} from "@/lib/genshield";
import { useAsync } from "@/lib/useAsync";
import { gen, pct, severityBucket, shortAddr, toAtto, when } from "@/lib/format";
import { Badge, Card, Crumb, Empty, Stat, toneForClaim, toneForVerdict } from "@/components/ui";
import TxButton from "@/components/TxButton";

const STAGES = ["FILED", "EVIDENCED", "ADJUDICATED", "SETTLED"] as const;

function Pipeline({ state }: { state: string }) {
  const current = state === "APPEALED" ? 2 : STAGES.indexOf(state as (typeof STAGES)[number]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-1 font-mono text-[11px] uppercase ${
              i < current
                ? "bg-ink-line text-slate-400"
                : i === current
                  ? "bg-signal-cool/15 text-signal-cool ring-1 ring-signal-cool/40"
                  : "text-slate-600"
            }`}
          >
            {s}
          </span>
          {i < STAGES.length - 1 ? <span className="text-slate-700">→</span> : null}
        </div>
      ))}
      {state === "APPEALED" ? <Badge tone="warn">under appeal</Badge> : null}
    </div>
  );
}

function ChainFacts({ json }: { json: string }) {
  let receipts: Record<string, unknown>[] = [];
  try {
    receipts = (JSON.parse(json || "{}").receipts ?? []) as Record<string, unknown>[];
  } catch {
    /* show nothing rather than guess */
  }
  if (receipts.length === 0) {
    return <p className="mt-2 text-xs text-slate-600">No transaction hashes were cited.</p>;
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left font-mono text-xs">
        <thead className="text-slate-600">
          <tr>
            <th className="pb-2 pr-4 font-normal">tx</th>
            <th className="pb-2 pr-4 font-normal">status</th>
            <th className="pb-2 pr-4 font-normal">block</th>
            <th className="pb-2 pr-4 font-normal">to</th>
            <th className="pb-2 font-normal">logs</th>
          </tr>
        </thead>
        <tbody className="text-slate-300">
          {receipts.map((r, i) => (
            <tr key={i} className="border-t border-ink-line">
              <td className="py-2 pr-4">{shortAddr(String(r.tx))}</td>
              <td className="py-2 pr-4">
                {r.found ? (
                  <span className={r.status === "0x1" ? "text-signal-ok" : "text-signal-bad"}>
                    {r.status === "0x1" ? "success" : "failed"}
                  </span>
                ) : (
                  <span className="text-slate-600">not found</span>
                )}
              </td>
              <td className="py-2 pr-4">{String(r.block_number ?? "-")}</td>
              <td className="py-2 pr-4">{shortAddr(String(r.to ?? ""))}</td>
              <td className="py-2">{String(r.log_count ?? "-")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [appealBond, setAppealBond] = useState("0.01");

  const { data, error, loading, reload } = useAsync(async () => {
    const claim = await getClaim(id);
    if (!claim) return { claim: undefined };
    const policy = await getPolicy(claim.policyId);
    const product = policy ? await getProduct(policy.productId) : undefined;
    return { claim, policy, product };
  }, [id]);

  if (loading) return <Empty>Loading claim…</Empty>;
  if (error) return <Card className="border-signal-bad/40"><div className="text-sm text-signal-bad">{error}</div></Card>;
  if (!data?.claim) return <Empty>No claim #{id} on this contract.</Empty>;

  const { claim, policy, product } = data;
  const atStake =
    policy && claim.lossBps !== "0"
      ? (BigInt(policy.coverageAtto) * BigInt(claim.lossBps)) / 10000n
      : 0n;

  return (
    <div className="space-y-8">
      <div>
        <Crumb href={policy ? `/policy/${policy.id}` : "/claims"}>
          ← {policy ? `Policy #${policy.id}` : "All claims"}
        </Crumb>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Claim #{claim.id}</h1>
          <Badge tone={toneForClaim(claim.state)}>{claim.state}</Badge>
          {claim.verdict ? <Badge tone={toneForVerdict(claim.verdict)}>{claim.verdict}</Badge> : null}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Filed by <span className="font-mono">{shortAddr(claim.claimant)}</span> on {when(claim.filedAt)}
        </div>
      </div>

      <Card>
        <Pipeline state={claim.state} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm uppercase tracking-wider text-slate-500">Evidence cited</h2>
          <ul className="mt-3 space-y-1.5">
            {claim.evidenceUrls.map((u) => (
              <li key={u}>
                <a href={u} target="_blank" rel="noreferrer" className="break-all font-mono text-xs text-signal-cool hover:underline">
                  {u}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-600">
            Fetched by the contract itself and fenced as untrusted data before the model sees it.
          </p>
        </Card>

        <Card>
          <h2 className="text-sm uppercase tracking-wider text-slate-500">
            On-chain facts <span className="normal-case text-slate-600">· agreed by strict equality</span>
          </h2>
          {claim.chainFactsJson ? (
            <ChainFacts json={claim.chainFactsJson} />
          ) : (
            <p className="mt-2 text-xs text-slate-600">Not yet attached.</p>
          )}
        </Card>
      </div>

      {claim.rounds.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wider text-slate-500">Adjudication rounds</h2>
          {claim.rounds.map((r, i) => (
            <Card key={i}>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={toneForVerdict(r.verdict)}>{r.verdict}</Badge>
                <span className="text-xs text-slate-500">
                  {r.appeal_round === 0 ? "first round" : `appeal round ${r.appeal_round}`}
                </span>
                {r.verdict === "COVERED" ? (
                  <span className="ml-auto font-mono text-xs text-slate-400">
                    severity decile {severityBucket(r.loss_bps)} · {pct(r.loss_bps)} of sum insured
                  </span>
                ) : null}
              </div>

              {r.controlling_clause ? (
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    Controlling clause
                  </div>
                  <p className="wording mt-1 border-l-2 border-signal-cool/40 pl-3 text-sm text-slate-200">
                    {r.controlling_clause}
                  </p>
                </div>
              ) : null}

              {r.reasoning ? (
                <p className="mt-4 text-sm leading-relaxed text-slate-400">{r.reasoning}</p>
              ) : null}
            </Card>
          ))}
          <p className="text-xs text-slate-600">
            Each round is an independent leader/validator pair: the validator refetches the
            evidence and forms its own reading. Agreement requires an exact verdict match and the
            same severity decile — the payout is computed from the agreed decile, never from one
            validator&apos;s raw number.
          </p>
        </section>
      ) : null}

      {claim.state === "SETTLED" ? (
        <Card className={claim.verdict === "COVERED" ? "border-signal-ok/30" : ""}>
          <h2 className="text-sm uppercase tracking-wider text-slate-500">Settled</h2>
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <Stat label="Payout" value={`${gen(claim.payoutAtto)} GEN`} />
            <Stat label="Filing bond" value={`${gen(claim.filingBondAtto)} GEN`} sub={claim.verdict === "COVERED" ? "returned" : "forfeited to pool"} />
            {claim.appealCount !== "0" ? (
              <Stat label="Appeal bond" value={`${gen(claim.appealBondAtto)} GEN`} sub={shortAddr(claim.appellant)} />
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-sm uppercase tracking-wider text-slate-500">Advance this claim</h2>
        <p className="mt-2 text-xs text-slate-600">
          Every step is permissionless — there is no resolver. Anyone can push a claim forward.
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-6">
          {claim.state === "FILED" ? (
            <TxButton
              label="Attach chain evidence"
              pendingLabel="Querying the insured chain…"
              action={(s, onPhase) => attachChainEvidence(s, id, onPhase)}
              onDone={reload}
            />
          ) : null}

          {claim.state === "EVIDENCED" || claim.state === "APPEALED" ? (
            <TxButton
              label={claim.state === "APPEALED" ? "Re-adjudicate" : "Adjudicate"}
              pendingLabel="Validators reading the evidence…"
              action={(s, onPhase) => adjudicate(s, id, onPhase)}
              onDone={reload}
            />
          ) : null}

          {claim.state === "ADJUDICATED" ? (
            <>
              <TxButton
                label="Settle"
                pendingLabel="Settling…"
                action={(s, onPhase) => settle(s, id, onPhase)}
                reconcile={async () => {
                  // Read the payout back off the settled claim rather than
                  // inferring it: the transfer runs at finalization, so this
                  // is the first moment the figure is real.
                  const c = await getClaim(id);
                  if (!c) return undefined;
                  return c.verdict === "COVERED"
                    ? `Paid ${gen(c.payoutAtto)} GEN to the claimant.`
                    : "Claim rejected. The filing bond went to the pool; no payout.";
                }}
                onDone={reload}
              />
              <div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs text-slate-500">
                    Appeal bond (GEN)
                    <input
                      value={appealBond}
                      onChange={(e) => setAppealBond(e.target.value)}
                      className="mt-1 block w-32 rounded border border-ink-line bg-ink px-2 py-1.5 font-mono text-sm text-slate-100"
                    />
                  </label>
                  <TxButton
                    label="Appeal"
                    action={(s, onPhase) => appeal(s, id, toAtto(appealBond), onPhase)}
                    onDone={reload}
                    variant="ghost"
                    hint={
                      atStake > 0n
                        ? `Scales with the ${gen(atStake)} GEN at stake. Returned if the rerun changes the answer.`
                        : "Returned if the rerun changes the answer."
                    }
                  />
                </div>
              </div>
            </>
          ) : null}

          {claim.state === "SETTLED" ? (
            <span className="text-sm text-slate-500">Nothing left to do.</span>
          ) : null}
        </div>
      </Card>

      {product ? (
        <Card>
          <h2 className="text-sm uppercase tracking-wider text-slate-500">Wording being applied</h2>
          <p className="wording mt-3 text-[15px] text-slate-200">{product.wording}</p>
        </Card>
      ) : null}
    </div>
  );
}
