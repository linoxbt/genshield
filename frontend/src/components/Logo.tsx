/**
 * The GenShield mark.
 *
 * A shield, because that is what the product is — but the shield is not the
 * idea. The idea is inside it: two circles, each one an independent reading
 * of the same claim, overlapping. The lens where they meet is the only part
 * that is solid, because agreement between independent judgments is the only
 * thing here that pays. A leader's answer alone is an outline; cover exists
 * where two readings coincide.
 *
 * That is the contract's actual rule drawn as a mark, not a decorative
 * shield with a symbol dropped inside it.
 */

type MarkProps = {
  size?: number;
  /** Ink-on-light rendering. Defaults to the dark register used sitewide. */
  light?: boolean;
  className?: string;
};

export function Mark({ size = 40, light = false, className = "" }: MarkProps) {
  const shield = light ? "#0d1117" : "#e6edf3";
  const reading = light ? "#0d1117" : "#8b98a5";
  const lens = "#58a6ff";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* The shield. Flat-topped with softened shoulders - a peaked top
          reads as a tent or a badge, not as cover. */}
      <path
        d="M9 10.5 A2.5 2.5 0 0 1 11.5 8 H36.5 A2.5 2.5 0 0 1 39 10.5 V25 C39 33.8 32.6 41 24 44.6 C15.4 41 9 33.8 9 25 Z"
        stroke={shield}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Two independent readings of the same claim */}
      <circle cx="20.2" cy="24.6" r="6.8" stroke={reading} strokeWidth="1.2" opacity="0.6" />
      <circle cx="27.8" cy="24.6" r="6.8" stroke={reading} strokeWidth="1.2" opacity="0.6" />

      {/* Where they agree - the only solid form in the mark */}
      <path d="M24 19 Q30 24.6 24 30.2 Q18 24.6 24 19 Z" fill={lens} />
    </svg>
  );
}

/** Ink-on-light variant, for light surfaces. */
export function LightMark(props: Omit<MarkProps, "light">) {
  return <Mark {...props} light />;
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`text-2xl font-semibold tracking-tight ${className}`}>GenShield</span>
  );
}
