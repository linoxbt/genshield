import Link from "next/link";
import { Card } from "@/components/ui";

const ROUNDS = [
  {
    n: "I",
    primitive: "run_nondet_unsafe",
    title: "Is the wording adjudicable?",
    body: "One round, before any capital stands behind the product, decides whether the coverage wording could be settled objectively from the evidence sources the underwriter nominated. A product that fails review can never sell a policy.",
    note: "On its first live run this gate rejected two real draft wordings: one for resting on an unquantified threshold, one for turning on a trader's intent. Neither can be established from evidence, so neither could ever have settled a claim fairly.",
  },
  {
    n: "II",
    primitive: "strict_eq",
    title: "What do the chain facts say?",
    body: "The contract posts eth_getTransactionReceipt and eth_getBlockByNumber to the insured chain's own RPC, then strips each receipt to fields two honest nodes cannot disagree about — status, block number, from, to, log count, block timestamp.",
    note: "Confirmation counts and gas-price fields are dropped rather than trusted. Leaving one in would make every claim fail consensus. The snapshot is frozen onto the claim before judgment, so the round that reads the wording cannot re-derive different facts alongside its verdict.",
  },
  {
    n: "III",
    primitive: "run_nondet_unsafe",
    title: "Does the wording cover it?",
    body: "The leader fetches the evidence and reads it against the wording. Every validator does the entire job again independently — its own fetch, its own reading — and never inspects the leader's answer for plausibility.",
    note: "A validator that only checked the leader's JSON for a well-formed shape and an in-range severity would be letting the leader decide every payout alone while looking like consensus.",
  },
];

export default function HowItWorks() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">How it works</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          On-chain insurance has never had a custody problem. It has a specification
          problem: a payout condition has to be encoded as a parametric trigger long before
          anyone knows what the failure will look like, so cover either fires on events that
          were not really losses or misses the loss that happened. Fixing that by importing
          judgment from off-chain puts back the thing on-chain insurance was meant to
          remove — a party who decides.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          GenShield keeps the wording in natural language and makes the wording itself the
          settlement logic. There is no resolver key. Anyone can push a claim to its next
          stage, and the answer is whatever independent validators agree the wording and the
          evidence say.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-slate-500">The three rounds</h2>
        {ROUNDS.map((r) => (
          <Card key={r.n}>
            <div className="flex items-baseline gap-4">
              <span className="font-doc text-3xl text-signal-cool">{r.n}</span>
              <div>
                <h3 className="text-lg text-slate-100">{r.title}</h3>
                <span className="font-mono text-[11px] text-slate-500">{r.primitive}</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">{r.body}</p>
            <p className="mt-3 border-l-2 border-ink-line pl-3 text-[13px] leading-relaxed text-slate-500">
              {r.note}
            </p>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-slate-500">Why severity is bucketed</h2>
        <Card>
          <p className="text-sm leading-relaxed text-slate-400">
            Two independent readings of the same incident will never produce the same raw
            loss percentage. Comparing raw severity would fail consensus on almost every
            genuine claim; comparing nothing would let the leader set the payout alone.
            Quantising to ten buckets before both comparison <em>and</em> storage is what
            makes a judged payout amount consensus-safe at all — and it is why the payout is
            computed from the agreed bucket&rsquo;s midpoint rather than from either
            validator&rsquo;s own number.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            The cost is granularity: severity resolves in ten-point steps. That is a
            deliberate trade — finer buckets tighten payouts but raise the rate at which
            honest rounds fail to agree.
          </p>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-slate-500">
          The evidence is chosen by someone with money at stake
        </h2>
        <Card>
          <p className="text-sm leading-relaxed text-slate-400">
            Which makes prompt injection a direct path to the pool, not a theoretical
            concern. Two defences sit in the contract itself. The underwriter fixes the
            admissible evidence hosts when the product opens, so a claimant can cite the
            protocol&rsquo;s own postmortem but not a page they control. And fetched content
            is delimited and labelled as untrusted data, under a standing instruction that
            text inside the fence is evidence to be weighed and never instructions to be
            followed, with per-source and total length caps so one huge page cannot crowd
            the wording out of the context.
          </p>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-slate-500">Solvency</h2>
        <Card>
          <p className="text-sm leading-relaxed text-slate-400">
            Enforced where the risk is taken. A product cannot write cover beyond its
            capital times a leverage cap, capital backing live policies cannot be withdrawn,
            and LP accounting is share-based — depositors mint shares against the
            pool&rsquo;s current value, so a payout dilutes every LP proportionally at the
            moment it happens. Flat per-depositor balances look equivalent and quietly let
            whoever exits first take the remaining capital at par after a loss.
          </p>
        </Card>
      </section>

      <div className="flex flex-wrap gap-4">
        <Link
          href="/products"
          className="rounded bg-signal-cool px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
        >
          Browse products
        </Link>
        <a
          href="https://github.com/linoxbt/genshield"
          target="_blank"
          rel="noreferrer"
          className="rounded border border-ink-line bg-ink-soft px-4 py-2 text-sm text-slate-200 hover:border-signal-cool"
        >
          Read the contract
        </a>
      </div>
    </div>
  );
}
