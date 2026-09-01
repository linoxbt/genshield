import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import AppKitProvider from "@/components/AppKitProvider";
import WalletButton from "@/components/WalletButton";
import { CONTRACT_ADDRESS, EXPLORER_URL } from "@/lib/genlayerConfig";
import { shortAddr } from "@/lib/format";

export const metadata: Metadata = {
  title: "GenShield — cover settled on policy wording",
  description:
    "DeFi insurance where the policy wording is the settlement logic. The contract fetches its own evidence and adjudicates under GenLayer consensus. No oracle adapter, no resolver key.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AppKitProvider>
          <header className="border-b border-ink-line">
            <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-lg font-semibold tracking-tight">GenShield</span>
                <span className="hidden text-xs text-slate-500 sm:inline">
                  cover settled on wording
                </span>
              </Link>
              <nav className="ml-auto flex items-center gap-5 text-sm text-slate-400">
                <Link href="/" className="hover:text-slate-100">
                  Products
                </Link>
                <Link href="/claims" className="hover:text-slate-100">
                  Claims
                </Link>
                <Link href="/underwrite" className="hover:text-slate-100">
                  Underwrite
                </Link>
                <WalletButton />
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

          <footer className="mt-16 border-t border-ink-line">
            <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span>GenLayer Studio Network</span>
                {CONTRACT_ADDRESS ? (
                  <a
                    className="font-mono hover:text-signal-cool"
                    href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddr(CONTRACT_ADDRESS)}
                  </a>
                ) : (
                  <span className="text-signal-warn">no contract configured</span>
                )}
                <a
                  className="hover:text-signal-cool"
                  href="https://github.com/linoxbt/genshield"
                  target="_blank"
                  rel="noreferrer"
                >
                  Source
                </a>
              </div>
            </div>
          </footer>
        </AppKitProvider>
      </body>
    </html>
  );
}
