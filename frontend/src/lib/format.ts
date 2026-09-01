const ATTO = 10n ** 18n;

/** GEN with a sensible number of decimals, never scientific notation. */
export function gen(atto: string | bigint, decimals = 4): string {
  const v = typeof atto === "bigint" ? atto : BigInt(atto || "0");
  const whole = v / ATTO;
  const frac = v % ATTO;
  if (frac === 0n) return whole.toString();
  const padded = frac.toString().padStart(18, "0").slice(0, decimals).replace(/0+$/, "");
  return padded ? `${whole}.${padded}` : whole.toString();
}

export function toAtto(input: string): bigint {
  const [whole, frac = ""] = input.trim().split(".");
  const padded = (frac + "0".repeat(18)).slice(0, 18);
  return BigInt(whole || "0") * ATTO + BigInt(padded || "0");
}

export function pct(bps: string | number, decimals = 2): string {
  const n = typeof bps === "number" ? bps : Number(bps || 0);
  return `${(n / 100).toFixed(decimals)}%`;
}

export function shortAddr(a?: string): string {
  if (!a) return "-";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function when(unixSeconds: string | number): string {
  const n = Number(unixSeconds || 0);
  if (!n) return "-";
  return new Date(n * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function utilisation(locked: string, capital: string): number {
  const c = Number(capital || 0);
  if (!c) return 0;
  return Math.min(100, (Number(locked || 0) / c) * 100);
}

/** The decile a severity falls in, mirroring the contract's own bucketing. */
export function severityBucket(lossBps: string | number): number {
  const n = typeof lossBps === "number" ? lossBps : Number(lossBps || 0);
  return Math.min(9, Math.floor((Math.max(0, Math.min(10000, n)) * 10) / 10000));
}
