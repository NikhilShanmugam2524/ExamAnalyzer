"use client";

/**
 * "Neuro" — DriveScore's original mascot.
 *
 * An upbeat neuron / brain-cell study coach (ties to the synapse theme): a
 * softly-glowing rounded cell body for a face, dendrite "arms" that gesture, a
 * trailing axon tail ending in a glowing synapse spark. Wholly original, drawn
 * as inline SVG (no external assets / no third-party IP), themed with the
 * student palette CSS variables, and animated with framer-motion.
 *
 * Personality: encouraging study buddy. It NEVER looks sad — even the "low
 * result" mood (`encourage`) is warm and supportive, not shaming.
 *
 * Expression states (via the `mood` prop):
 *   - welcome    smiling, waving a dendrite        (home hero)
 *   - cheer      arms raised + sparkles            (strong result)
 *   - encourage  warm, gentle thumbs-up            (mixed / low result)
 *   - thinking   small thinking pose               (loading)
 *
 * All idle micro-motion (bob, blink, synapse glow, wave) respects
 * `prefers-reduced-motion`: when reduced, it renders a calm static pose.
 */

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type NeuroMood = "welcome" | "cheer" | "encourage" | "thinking";

const ARIA: Record<NeuroMood, string> = {
  welcome: "Neuro, the DriveScore study buddy, waving hello",
  cheer: "Neuro, the DriveScore study buddy, cheering",
  encourage: "Neuro, the DriveScore study buddy, giving an encouraging thumbs-up",
  thinking: "Neuro, the DriveScore study buddy, thinking",
};

const INK = "#0A1F1C";

export function Neuro({
  mood = "welcome",
  size = 132,
  className,
}: {
  mood?: NeuroMood;
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const bodyGrad = `neuroBody-${uid}`;
  const sparkGrad = `neuroSpark-${uid}`;

  // Pupils drift up-left when "thinking".
  const pupil = mood === "thinking" ? { dx: -2.5, dy: -3 } : { dx: 0, dy: 0 };
  const showBlush = mood !== "thinking";

  return (
    <motion.svg
      viewBox="0 0 200 210"
      width={size}
      height={size * (210 / 200)}
      className={className}
      role="img"
      aria-label={ARIA[mood]}
      initial={false}
    >
      <defs>
        <radialGradient id={bodyGrad} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="var(--energy-soft)" />
          <stop offset="62%" stopColor="var(--energy)" />
          <stop offset="100%" stopColor="var(--energy-deep)" />
        </radialGradient>
        <radialGradient id={sparkGrad} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3D6" />
          <stop offset="55%" stopColor="var(--reward)" />
          <stop offset="100%" stopColor="#F08A00" />
        </radialGradient>
      </defs>

      {/* Glow halo (stays put while the character bobs → subtle parallax). */}
      <motion.circle
        cx={100}
        cy={96}
        r={70}
        fill="var(--energy-soft)"
        opacity={0.18}
        style={{ transformBox: "view-box", transformOrigin: "100px 96px" }}
        animate={reduce ? undefined : { scale: [1, 1.06, 1], opacity: [0.16, 0.26, 0.16] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Everything that bobs together. */}
      <motion.g
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* ── Axon tail + synapse spark ── */}
        <path
          d="M138 138 C 158 156, 150 178, 168 188"
          fill="none"
          stroke="var(--energy-deep)"
          strokeWidth={6}
          strokeLinecap="round"
        />
        <motion.g
          style={{ transformBox: "view-box", transformOrigin: "171px 190px" }}
          animate={reduce ? undefined : { scale: [0.82, 1.18, 0.82], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx={171} cy={190} r={12} fill="var(--reward)" opacity={0.35} />
          <circle cx={171} cy={190} r={7} fill={`url(#${sparkGrad})`} />
        </motion.g>

        {/* ── Decorative dendrites (top of the cell) ── */}
        <Dendrite x1={74} y1={56} x2={58} y2={28} />
        <Dendrite x1={100} y1={50} x2={100} y2={20} />
        <Dendrite x1={126} y1={56} x2={142} y2={28} />

        {/* ── Arms (pose by mood) ── */}
        <Arms mood={mood} reduce={!!reduce} />

        {/* ── Cell body (the face) ── */}
        <ellipse
          cx={100}
          cy={96}
          rx={52}
          ry={50}
          fill={`url(#${bodyGrad})`}
          stroke={INK}
          strokeOpacity={0.85}
          strokeWidth={3}
        />
        {/* membrane sheen */}
        <ellipse cx={82} cy={74} rx={20} ry={13} fill="#FFFFFF" opacity={0.28} />

        {/* ── Blush ── */}
        {showBlush && (
          <>
            <ellipse cx={70} cy={106} rx={9} ry={6} fill="var(--pop)" opacity={0.22} />
            <ellipse cx={130} cy={106} rx={9} ry={6} fill="var(--pop)" opacity={0.22} />
          </>
        )}

        {/* ── Eyes (blink) ── */}
        <motion.g
          style={{ transformBox: "view-box", transformOrigin: "100px 90px" }}
          animate={reduce ? undefined : { scaleY: [1, 1, 0.12, 1, 1] }}
          transition={{
            duration: 4.4,
            repeat: Infinity,
            times: [0, 0.9, 0.94, 0.98, 1],
            ease: "easeInOut",
          }}
        >
          <Eye cx={82} cy={90} pupil={pupil} />
          <Eye cx={118} cy={90} pupil={pupil} />
        </motion.g>

        {/* thinking brow (one gently raised) */}
        {mood === "thinking" && (
          <path
            d="M108 74 Q 118 70 128 73"
            fill="none"
            stroke={INK}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.8}
          />
        )}

        {/* ── Mouth (by mood) ── */}
        <Mouth mood={mood} />

        {/* Sparkles only when cheering. */}
        {mood === "cheer" && <Sparkles reduce={!!reduce} />}
      </motion.g>
    </motion.svg>
  );
}

function Dendrite({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--energy-deep)" strokeWidth={5} strokeLinecap="round" />
      <circle cx={x2} cy={y2} r={5} fill="var(--energy-deep)" />
    </g>
  );
}

function Eye({
  cx,
  cy,
  pupil,
}: {
  cx: number;
  cy: number;
  pupil: { dx: number; dy: number };
}) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={11} ry={13} fill="#FBFAF6" stroke={INK} strokeOpacity={0.15} strokeWidth={1.5} />
      <circle cx={cx + pupil.dx} cy={cy + pupil.dy} r={6} fill={INK} />
      <circle cx={cx + pupil.dx - 2} cy={cy + pupil.dy - 3} r={2.2} fill="#FFFFFF" />
    </g>
  );
}

function Mouth({ mood }: { mood: NeuroMood }) {
  if (mood === "cheer") {
    return (
      <g>
        <path d="M80 112 Q 100 118 120 112 Q 114 136 100 136 Q 86 136 80 112 Z" fill={INK} />
        <path d="M90 130 Q 100 137 110 130 Q 100 133 90 130 Z" fill="var(--pop)" />
      </g>
    );
  }
  if (mood === "thinking") {
    return (
      <path
        d="M92 120 Q 100 123 108 119"
        fill="none"
        stroke={INK}
        strokeWidth={4}
        strokeLinecap="round"
      />
    );
  }
  // welcome + encourage: warm, friendly smile (encourage a touch gentler)
  const d = mood === "encourage" ? "M86 116 Q 100 128 114 116" : "M84 115 Q 100 132 116 115";
  return <path d={d} fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />;
}

function Arms({ mood, reduce }: { mood: NeuroMood; reduce: boolean }) {
  const armStroke = {
    stroke: "var(--energy-deep)",
    strokeWidth: 8,
    strokeLinecap: "round" as const,
    fill: "none" as const,
  };
  const Hand = ({ cx, cy }: { cx: number; cy: number }) => (
    <circle cx={cx} cy={cy} r={9} fill="var(--energy-deep)" stroke={INK} strokeOpacity={0.85} strokeWidth={2.5} />
  );

  if (mood === "cheer") {
    return (
      <g>
        <path d="M62 120 C 44 104, 40 80, 44 62" {...armStroke} />
        <Hand cx={44} cy={60} />
        <path d="M138 120 C 156 104, 160 80, 156 62" {...armStroke} />
        <Hand cx={156} cy={60} />
      </g>
    );
  }

  if (mood === "encourage") {
    return (
      <g>
        {/* relaxed left arm */}
        <path d="M60 124 C 50 138, 48 150, 50 160" {...armStroke} />
        <Hand cx={50} cy={162} />
        {/* right arm: thumbs-up */}
        <path d="M140 122 C 152 116, 158 108, 158 100" {...armStroke} />
        <circle cx={159} cy={98} r={10} fill="var(--energy-deep)" stroke={INK} strokeOpacity={0.85} strokeWidth={2.5} />
        <rect x={154} y={78} width={10} height={16} rx={5} fill="var(--energy-deep)" stroke={INK} strokeOpacity={0.85} strokeWidth={2.5} />
      </g>
    );
  }

  if (mood === "thinking") {
    return (
      <g>
        <path d="M60 124 C 50 138, 48 150, 50 160" {...armStroke} />
        <Hand cx={50} cy={162} />
        {/* hand up to the chin */}
        <path d="M140 124 C 134 130, 126 132, 120 130" {...armStroke} />
        <Hand cx={118} cy={130} />
      </g>
    );
  }

  // welcome: relaxed left, raised right hand that waves
  return (
    <g>
      <path d="M60 124 C 50 138, 48 150, 50 160" {...armStroke} />
      <Hand cx={50} cy={162} />
      <motion.g
        style={{ transformBox: "view-box", transformOrigin: "140px 120px" }}
        animate={reduce ? undefined : { rotate: [0, 16, 2, 16, 0] }}
        transition={{ duration: 1.9, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
      >
        <path d="M140 120 C 158 108, 166 88, 166 72" {...armStroke} />
        <Hand cx={166} cy={70} />
      </motion.g>
    </g>
  );
}

function Sparkles({ reduce }: { reduce: boolean }) {
  const spots = [
    { x: 46, y: 50, s: 7, c: "var(--reward)", d: 0 },
    { x: 156, y: 46, s: 9, c: "var(--energy)", d: 0.4 },
    { x: 168, y: 110, s: 6, c: "var(--reward)", d: 0.8 },
    { x: 36, y: 104, s: 6, c: "var(--accent2)", d: 0.6 },
  ];
  return (
    <g>
      {spots.map((sp, i) => (
        <motion.path
          key={i}
          d={star(sp.x, sp.y, sp.s)}
          fill={sp.c}
          style={{ transformBox: "view-box", transformOrigin: `${sp.x}px ${sp.y}px` }}
          animate={reduce ? undefined : { scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: sp.d, ease: "easeInOut" }}
        />
      ))}
    </g>
  );
}

/** A four-point sparkle star centred at (cx, cy). */
function star(cx: number, cy: number, r: number): string {
  const t = r * 0.34; // waist
  return [
    `M${cx} ${cy - r}`,
    `Q ${cx + t} ${cy - t} ${cx + r} ${cy}`,
    `Q ${cx + t} ${cy + t} ${cx} ${cy + r}`,
    `Q ${cx - t} ${cy + t} ${cx - r} ${cy}`,
    `Q ${cx - t} ${cy - t} ${cx} ${cy - r}`,
    "Z",
  ].join(" ");
}
