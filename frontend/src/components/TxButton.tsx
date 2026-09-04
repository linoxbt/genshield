"use client";

import { useState, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { connectedSigner } from "@/lib/walletProvider";
import type { TxPhase } from "@/lib/genshield";
import type { Address } from "genlayer-js/types";

type Signer = { provider: Awaited<ReturnType<typeof connectedSigner>>["provider"]; account: Address };

const PHASE_LABEL: Record<TxPhase, string> = {
  signing: "Waiting for your wallet…",
  submitted: "Submitted, waiting for validators…",
  accepted: "Accepted — waiting for finalization…",
  finalized: "Finalized",
};

/**
 * A write button that reports what has actually happened, not what was merely
 * sent.
 *
 * Nothing is called complete before the transaction is finalized. The contract
 * emits every transfer with `on="finalized"`, so at the "accepted" stage a
 * payout or withdrawal has not moved yet — saying "done" there would be a lie
 * about the user's money. The phases are shown separately so a wait that runs
 * for minutes still tells the user where it is.
 *
 * `reconcile` runs after finalization for actions that move value: it re-reads
 * the affected state from the chain and returns what actually landed, so the
 * figure shown comes from the settled contract rather than from the arguments
 * that were submitted.
 */
export default function TxButton({
  label,
  pendingLabel,
  action,
  reconcile,
  onDone,
  disabled,
  hint,
  variant = "primary",
}: {
  label: string;
  pendingLabel?: string;
  action: (signer: Signer, onPhase: (p: TxPhase) => void) => Promise<unknown>;
  reconcile?: () => Promise<string | undefined>;
  onDone?: () => void;
  disabled?: boolean;
  hint?: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const { isConnected } = useAccount();
  const [phase, setPhase] = useState<TxPhase | undefined>();
  const [busy, setBusy] = useState(false);
  const [settled, setSettled] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const base =
    variant === "primary"
      ? "bg-signal-cool text-ink hover:opacity-90"
      : "border border-ink-line bg-ink-soft text-slate-200 hover:border-signal-cool";

  async function run() {
    setError(undefined);
    setSettled(undefined);
    setBusy(true);
    setPhase("signing");
    try {
      const signer = (await connectedSigner()) as Signer;
      await action(signer, setPhase);
      // Only past this point has anything actually moved.
      const outcome = await reconcile?.();
      if (outcome) setSettled(outcome);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setPhase(undefined);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={busy || disabled || !isConnected}
        className={`rounded px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${base}`}
      >
        {busy ? pendingLabel ?? "Submitting…" : label}
      </button>

      {!isConnected ? (
        <div className="mt-1.5 text-xs text-slate-500">Connect a wallet to sign.</div>
      ) : null}

      {hint && !busy ? <div className="mt-1.5 text-xs text-slate-500">{hint}</div> : null}

      {busy && phase ? (
        <div className="mt-2 text-xs text-slate-400">
          {PHASE_LABEL[phase]}
          {phase === "accepted" ? (
            <span className="mt-1 block text-slate-600">
              Transfers execute at finalization, so nothing has moved yet. Leave this open.
            </span>
          ) : null}
        </div>
      ) : null}

      {settled ? (
        <div className="mt-2 rounded border border-signal-ok/40 bg-signal-ok/10 p-2 text-xs text-signal-ok">
          {settled}
        </div>
      ) : null}

      {error ? (
        <div className="mt-2 max-w-md break-words rounded border border-signal-bad/40 bg-signal-bad/10 p-2 text-xs text-signal-bad">
          {error}
        </div>
      ) : null}
    </div>
  );
}
