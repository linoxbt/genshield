"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProduct } from "@/lib/genshield";
import { toAtto } from "@/lib/format";
import { Card } from "@/components/ui";
import TxButton from "@/components/TxButton";

export default function UnderwritePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [wording, setWording] = useState("");
  const [hosts, setHosts] = useState("");
  const [rpc, setRpc] = useState("https://ethereum-rpc.publicnode.com");
  const [rate, setRate] = useState("10");
  const [minCover, setMinCover] = useState("0.1");
  const [maxCover, setMaxCover] = useState("5");
  const [leverage, setLeverage] = useState("20000");
  const [slope, setSlope] = useState("5000");

  const hostList = hosts.split(/[\s,]+/).filter(Boolean);
  const ready = name.trim() && wording.trim() && hostList.length > 0 && rpc.trim();

  const field =
    "mt-1 block w-full rounded border border-ink-line bg-ink px-2 py-1.5 font-mono text-sm text-slate-100";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Open a product</h1>
        <p className="mt-2 text-sm text-slate-400">
          The wording you write here is the settlement logic — it is what validators will read
          every claim against. Before this product can sell a single policy, a consensus round
          must find the wording adjudicable.
        </p>
      </div>

      <Card className="border-signal-warn/30">
        <h2 className="text-sm uppercase tracking-wider text-slate-500">What gets rejected</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Wording fails review when it cannot be settled from evidence. Thresholds that are not
          quantified (&ldquo;deviates materially&rdquo;), and triggers that turn on someone&apos;s
          intent (&ldquo;deliberate manipulation&rdquo;), both fail — nobody can observe them.
          Name a specific failure, of a specific system, with a loss that reporting or on-chain
          data could actually evidence.
        </p>
      </Card>

      <Card>
        <div className="space-y-4">
          <label className="block text-xs text-slate-500">
            Product name
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </label>

          <label className="block text-xs text-slate-500">
            Policy wording
            <textarea
              value={wording}
              onChange={(e) => setWording(e.target.value)}
              rows={7}
              placeholder="This policy covers loss of principal on … where published incident reporting states that …"
              className={`${field} wording text-[15px]`}
            />
          </label>

          <label className="block text-xs text-slate-500">
            Admissible evidence hosts (one per line)
            <textarea
              value={hosts}
              onChange={(e) => setHosts(e.target.value)}
              rows={2}
              placeholder="rekt.news"
              className={field}
            />
            <span className="mt-1 block text-slate-600">
              Claimants may only cite URLs on these hosts.
            </span>
          </label>

          <label className="block text-xs text-slate-500">
            Insured chain JSON-RPC endpoint
            <input value={rpc} onChange={(e) => setRpc(e.target.value)} className={field} />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-xs text-slate-500">
              Rate (bps per day)
              <input value={rate} onChange={(e) => setRate(e.target.value)} className={field} />
            </label>
            <label className="block text-xs text-slate-500">
              Min cover (GEN)
              <input value={minCover} onChange={(e) => setMinCover(e.target.value)} className={field} />
            </label>
            <label className="block text-xs text-slate-500">
              Max cover (GEN)
              <input value={maxCover} onChange={(e) => setMaxCover(e.target.value)} className={field} />
            </label>
            <label className="block text-xs text-slate-500">
              Max leverage (bps)
              <input value={leverage} onChange={(e) => setLeverage(e.target.value)} className={field} />
              <span className="mt-1 block text-slate-600">10000 = 1x capital</span>
            </label>
            <label className="block text-xs text-slate-500">
              Utilisation slope (bps)
              <input value={slope} onChange={(e) => setSlope(e.target.value)} className={field} />
              <span className="mt-1 block text-slate-600">Premium surcharge as the pool fills</span>
            </label>
          </div>
        </div>

        <div className="mt-6">
          <TxButton
            label="Create product"
            action={(s) =>
              createProduct(s, {
                name: name.trim(),
                wording: wording.trim(),
                evidenceHosts: hostList,
                chainRpc: rpc.trim(),
                rateBpsPerDay: Number(rate),
                minCoverageAtto: toAtto(minCover),
                maxCoverageAtto: toAtto(maxCover),
                maxLeverageBps: Number(leverage),
                utilSlopeBps: Number(slope),
              })
            }
            onDone={() => router.push("/")}
            disabled={!ready}
            hint="Then run the underwriting review from the product page."
          />
        </div>
      </Card>
    </div>
  );
}
