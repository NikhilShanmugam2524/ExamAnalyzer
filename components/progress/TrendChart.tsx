"use client";

/**
 * Multi-series rating "worm" chart — hand-rolled SVG, no chart dependency.
 *
 * Plots each subject's Elo rating over time on a shared date axis, skinned for
 * the dark cinematic theme (glowing lines, soft area fill, a reference line at
 * the 1000 starting rating). Readable 2D by design — see docs decision log.
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type ChartSeries = {
  label: string;
  color: string;
  points: { t: number; rating: number }[];
};

const W = 480;
const H = 200;
const PAD = { top: 16, right: 18, bottom: 26, left: 44 };

const niceFloor = (v: number, step: number) => Math.floor(v / step) * step;
const niceCeil = (v: number, step: number) => Math.ceil(v / step) * step;

export function TrendChart({ series }: { series: ChartSeries[] }) {
  const reduce = useReducedMotion();

  const model = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    const ts = all.map((p) => p.t);
    const rs = all.map((p) => p.rating);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);
    // Always include the 1000 baseline so "above/below start" reads clearly.
    const yMin = niceFloor(Math.min(...rs, START) - 20, 50);
    const yMax = niceCeil(Math.max(...rs, START) + 20, 50);
    const tSpan = tMax - tMin || 1;
    const ySpan = yMax - yMin || 1;

    const px = (t: number) =>
      PAD.left + ((t - tMin) / tSpan) * (W - PAD.left - PAD.right);
    const py = (r: number) =>
      PAD.top + (1 - (r - yMin) / ySpan) * (H - PAD.top - PAD.bottom);

    // Horizontal gridline ratings (every 50 pts).
    const ticks: number[] = [];
    for (let r = yMin; r <= yMax; r += 50) ticks.push(r);

    return { tMin, tMax, yMin, yMax, px, py, ticks };
  }, [series]);

  const fmtDate = (t: number) =>
    new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Subject rating over time"
    >
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`fill-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* Gridlines + y labels */}
      {model.ticks.map((r) => {
        const y = model.py(r);
        const isBaseline = r === START;
        return (
          <g key={r}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke={isBaseline ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)"}
              strokeDasharray={isBaseline ? "3 3" : undefined}
            />
            <text
              x={PAD.left - 7}
              y={y}
              fontSize="8"
              textAnchor="end"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.45)"
            >
              {r}
            </text>
          </g>
        );
      })}

      {/* x labels: first + last date */}
      <text x={PAD.left} y={H - 8} fontSize="8" fill="rgba(255,255,255,0.4)">
        {fmtDate(model.tMin)}
      </text>
      <text
        x={W - PAD.right}
        y={H - 8}
        fontSize="8"
        fill="rgba(255,255,255,0.4)"
        textAnchor="end"
      >
        {fmtDate(model.tMax)}
      </text>

      {/* Series */}
      {series.map((s, i) => {
        const pts = s.points.map((p) => [model.px(p.t), model.py(p.rating)] as const);
        const line = pts.map(([x, y], j) => `${j === 0 ? "M" : "L"}${x},${y}`).join(" ");
        const area =
          pts.length > 1
            ? `${line} L${pts[pts.length - 1][0]},${model.py(model.yMin)} L${pts[0][0]},${model.py(model.yMin)} Z`
            : "";
        return (
          <g key={s.label}>
            {area && <path d={area} fill={`url(#fill-${i})`} />}
            {/* soft glow underlay */}
            <path d={line} fill="none" stroke={s.color} strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <motion.path
              d={line}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.12 }}
            />
            {pts.map(([x, y], j) => (
              <circle key={j} cx={x} cy={y} r={pts.length === 1 ? 3 : 2} fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

const START = 1000;
