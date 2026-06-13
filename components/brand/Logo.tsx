/**
 * DriveScore brand logo.
 *
 * The mark is a teal rounded tile with the "DS" monogram and a rising chevron
 * above it (the "level-up" concept). The teal tile is self-contained, so it
 * reads well on both light and dark backgrounds — one mark everywhere.
 *
 * Usage:
 *   <Logo />                         full lockup (mark + DriveScore wordmark)
 *   <Logo wordmark={false} />        mark only (app-icon style)
 *   <Logo size={28} />               smaller
 *
 * The wordmark's "Drive" inherits the current text color (so it's ink on light
 * surfaces, paper on dark ones); "Score" is always teal.
 */

const TEAL = "#00E0B8";
const INK = "#06140f";

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="DriveScore"
    >
      <rect width="120" height="120" rx="28" fill={TEAL} />
      <path
        d="M40 40 L60 24 L80 40"
        fill="none"
        stroke={INK}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="50%"
        y="63%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={INK}
        style={{ fontFamily: "var(--font-brand), sans-serif", fontWeight: 900 }}
        fontSize="52"
        letterSpacing="-3"
      >
        DS
      </text>
    </svg>
  );
}

export function Logo({
  size = 38,
  wordmark = true,
  className = "",
  wordmarkClassName = "",
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
  /** Extra classes for the wordmark text (e.g. font size). */
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {wordmark && (
        <span
          className={`font-extrabold tracking-tight leading-none ${wordmarkClassName}`}
          style={{ fontFamily: "var(--font-brand), sans-serif" }}
        >
          Drive<span style={{ color: TEAL }}>Score</span>
        </span>
      )}
    </span>
  );
}
