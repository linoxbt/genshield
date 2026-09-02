import { severityBucket } from "@/lib/format";

const BUCKETS = 10;

/**
 * The contract's severity rule, drawn to scale.
 *
 * Ten buckets across the full loss range. Two independent readings of the
 * same claim are marked on it. If they land in the same bucket the round
 * agrees, and the payout is that bucket's midpoint — never either reading's
 * own number. If they land in different buckets there is no verdict and the
 * round rotates.
 *
 * This is the actual rule, not an illustration of one: `severityBucket`
 * here is the same quantisation the contract applies before it compares or
 * stores anything.
 */
export function DecileBar({
  leaderBps,
  validatorBps,
  size = "default",
}: {
  leaderBps: number;
  validatorBps: number;
  size?: "default" | "compact";
}) {
  const a = severityBucket(leaderBps);
  const b = severityBucket(validatorBps);
  const agreed = a === b;
  const width = 100 / BUCKETS;
  const h = size === "compact" ? "h-16" : "h-24 md:h-32";

  return (
    <div>
      <div className={`relative ${h}`}>
        {/* the ten buckets */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex gap-[3px]">
          {Array.from({ length: BUCKETS }, (_, i) => (
            <div
              key={i}
              className={`h-8 md:h-10 flex-1 border transition-colors ${
                agreed && i === a
                  ? "border-signal-cool bg-signal-cool/25"
                  : i === a || i === b
                    ? "border-signal-warn/60 bg-signal-warn/10"
                    : "border-ink-line"
              }`}
            />
          ))}
        </div>

        {/* where each independent reading actually landed */}
        <Reading label="Leader" bps={leaderBps} agreed={agreed} align="top" width={width} />
        <Reading label="Validator" bps={validatorBps} agreed={agreed} align="bottom" width={width} />
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-white/30 tabnum">
        <span>0% loss</span>
        <span className={agreed ? "text-signal-cool" : "text-signal-warn"}>
          {agreed
            ? `agreed · decile ${a} · pays ${(a * 10 + 5).toFixed(0)}% of the sum insured`
            : `no agreement · decile ${a} vs ${b} · the round rotates`}
        </span>
        <span>100%</span>
      </div>
    </div>
  );
}

function Reading({
  label,
  bps,
  agreed,
  align,
  width,
}: {
  label: string;
  bps: number;
  agreed: boolean;
  align: "top" | "bottom";
  width: number;
}) {
  const bucket = severityBucket(bps);
  const left = bucket * width + width / 2;
  const tone = agreed ? "text-signal-cool" : "text-signal-warn";
  return (
    <div
      className={`absolute -translate-x-1/2 flex flex-col items-center ${
        align === "top" ? "top-0" : "bottom-0"
      }`}
      style={{ left: `${left}%` }}
    >
      {align === "bottom" ? <span className={`h-3 w-px ${agreed ? "bg-signal-cool" : "bg-signal-warn"}`} /> : null}
      <span className={`font-mono text-[10px] whitespace-nowrap ${tone}`}>
        {label} {(bps / 100).toFixed(0)}%
      </span>
      {align === "top" ? <span className={`h-3 w-px ${agreed ? "bg-signal-cool" : "bg-signal-warn"}`} /> : null}
    </div>
  );
}
