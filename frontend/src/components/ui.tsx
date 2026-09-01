import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-ink-line bg-ink-soft/60 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-lg text-slate-100">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

const TONE: Record<string, string> = {
  ok: "border-signal-ok/40 bg-signal-ok/10 text-signal-ok",
  bad: "border-signal-bad/40 bg-signal-bad/10 text-signal-bad",
  warn: "border-signal-warn/40 bg-signal-warn/10 text-signal-warn",
  cool: "border-signal-cool/40 bg-signal-cool/10 text-signal-cool",
  mute: "border-ink-line bg-ink-soft text-slate-400",
};

export function Badge({ tone = "mute", children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export function toneForReview(state: string) {
  return state === "APPROVED" ? "ok" : state === "REJECTED" ? "bad" : "warn";
}

export function toneForVerdict(v: string) {
  return v === "COVERED" ? "ok" : v === "NOT_COVERED" ? "bad" : "mute";
}

export function toneForClaim(state: string) {
  if (state === "SETTLED") return "cool";
  if (state === "ADJUDICATED" || state === "APPEALED") return "warn";
  return "mute";
}

export function Meter({ percent, label }: { percent: number; label?: string }) {
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-line">
        <div
          className="h-full rounded-full bg-signal-cool"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      {label ? <div className="mt-1 text-xs text-slate-500">{label}</div> : null}
    </div>
  );
}

export function Crumb({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-xs text-slate-500 hover:text-signal-cool">
      {children}
    </Link>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-ink-line p-8 text-center text-sm text-slate-500">{children}</div>;
}
