"use client";

import { useAppKit } from "@reown/appkit/react";
import { useAccount, useDisconnect } from "wagmi";
import { shortAddr } from "@/lib/format";
import { REOWN_PROJECT_ID } from "@/lib/wagmiConfig";

export default function WalletButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (!REOWN_PROJECT_ID) {
    return (
      <span className="text-xs text-signal-warn" title="NEXT_PUBLIC_REOWN_PROJECT_ID is unset">
        wallet unavailable
      </span>
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="rounded border border-ink-line bg-ink-soft px-3 py-1.5 font-mono text-xs hover:border-signal-cool"
        title="Disconnect"
      >
        {shortAddr(address)}
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      className="rounded bg-signal-cool px-3 py-1.5 text-xs font-medium text-ink hover:opacity-90"
    >
      Connect wallet
    </button>
  );
}
