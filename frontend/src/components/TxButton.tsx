"use client";

import { useState, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { connectedSigner } from "@/lib/walletProvider";
import type { Address } from "genlayer-js/types";

type Signer = { provider: Awaited<ReturnType<typeof connectedSigner>>["provider"]; account: Address };

/**
 * A write button that owns its own pending/error state. Rounds that call an
 * LLM across every validator take a while, so the pending label is explicit
 * about what is happening rather than showing a generic spinner.
 */
export default function TxButton({
  label,
  pendingLabel,
  action,
  onDone,
  disabled,
  hint,
  variant = "primary",
}: {
  label: string;
  pendingLabel?: string;
  action: (signer: Signer) => Promise<unknown>;
  onDone?: () => void;
  disabled?: boolean;
  hint?: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const { isConnected } = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const base =
    variant === "primary"
      ? "bg-signal-cool text-ink hover:opacity-90"
      : "border border-ink-line bg-ink-soft text-slate-200 hover:border-signal-cool";

  async function run() {
    setError(undefined);
    setBusy(true);
    try {
      const signer = (await connectedSigner()) as Signer;
      await action(signer);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
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
      {busy ? (
        <div className="mt-1.5 text-xs text-slate-500">
          Consensus rounds can take a minute or more — leave this open.
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
