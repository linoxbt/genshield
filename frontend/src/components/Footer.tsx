import Link from "next/link";
import { Mark } from "./Logo";
import { MENU_LINKS } from "@/lib/navLinks";
import { CONTRACT_ADDRESS, EXPLORER_URL } from "@/lib/genlayerConfig";
import { shortAddr } from "@/lib/format";

const PRODUCT_LINKS = MENU_LINKS.filter((l) => ["/products", "/claims", "/underwrite"].includes(l.href));
const RESOURCE_LINKS = MENU_LINKS.filter((l) => l.href === "/how-it-works");

const STACK: [string, string][] = [
  ["Chain", "GenLayer Studio Network"],
  ["Runtime", "GenVM intelligent contract"],
  ["Verdict", "run_nondet_unsafe, independent rerun"],
  ["Chain facts", "strict_eq over the insured chain's RPC"],
  ["Severity", "10 buckets, agreed before stored"],
];

/**
 * Always-dark closing section with real weight rather than a single thin
 * row. Every zone is content the app genuinely has — the same nav list the
 * menu uses, the actual protocol stack, the live contract address. No
 * invented contact or social links.
 */
export function Footer() {
  return (
    <footer className="relative bg-ink mt-auto overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-1/4 -bottom-1/3 opacity-[0.07] animate-slow-spin"
      >
        <Mark size={680} />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-[1.4fr_1fr_1fr] mb-14">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Mark size={30} />
              <span className="text-xl font-semibold text-white tracking-tight">GenShield</span>
            </div>
            <p className="text-sm text-white/50 max-w-xs leading-relaxed">
              Cover for DeFi protocols, written in plain language. The contract gathers its
              own evidence and reads it against the wording under consensus — no oracle
              adapter, no parametric trigger, and no resolver key.
            </p>
          </div>

          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40 block mb-4">
              Product
            </span>
            <nav className="flex flex-col gap-2.5">
              {PRODUCT_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-white/70 hover:text-white transition-colors w-fit"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40 block mb-4">
              Resources
            </span>
            <nav className="flex flex-col gap-2.5">
              {RESOURCE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-white/70 hover:text-white transition-colors w-fit"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href="https://github.com/linoxbt/genshield"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-white/70 hover:text-white transition-colors w-fit"
              >
                Source
              </a>
            </nav>
          </div>
        </div>

        <div className="border-t border-ink-line pt-8 mb-8">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40 block mb-4">
            Stack
          </span>
          <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] text-white/50">
            {STACK.map(([label, value]) => (
              <span key={label}>
                <span className="text-white/30">{label}</span> {value}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-ink-line pt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="font-doc text-lg text-white/80">
            The wording decides. The validators agree, or nobody is paid.
          </p>
          <p className="font-mono text-[11px] text-white/30">
            {CONTRACT_ADDRESS ? (
              <a
                href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-signal-cool"
              >
                {shortAddr(CONTRACT_ADDRESS)}
              </a>
            ) : (
              "no contract configured"
            )}{" "}
            · GenLayer Studio Network
          </p>
        </div>
      </div>
    </footer>
  );
}
