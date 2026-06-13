import type { Config } from "tailwindcss";

/**
 * DriveScore design tokens.
 *
 * The palette is a deliberate "calm clinical" direction:
 *  - `ink`   : deep teal-green, the trustworthy base (teacher / parent tone)
 *  - `teal`  : the primary brand green
 *  - `amber` : the warm accent used sparingly for the student tone & CTAs
 *  - category colours map 1:1 to the four Diagnosis Engine buckets.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#0c2b2a",
          soft: "#13413f",
        },
        teal: {
          DEFAULT: "#0d9488",
          deep: "#0f766e",
          soft: "#5eead4",
        },
        amber: {
          DEFAULT: "#f59e0b",
          soft: "#fcd34d",
        },
        // Diagnosis category accents
        gap: "#e11d48", // CONCEPT_GAP  — rose
        careless: "#f59e0b", // CARELESS  — amber
        slow: "#6366f1", // TOO_SLOW   — indigo
        time: "#64748b", // TIME_MANAGEMENT — slate
        solid: "#10b981", // SOLID      — emerald

        // ── Student-facing "energetic & motivating" palette (M-UI) ──
        // Additive: teacher/admin/parent screens never reference these.
        energy: {
          DEFAULT: "#00E0B8", // electric mint — primary "go" / progress / wins
          deep: "#00B89A",
          soft: "#7CF0DD",
        },
        pop: "#FF5A4D", // vivid coral — attention / wrong / alerts
        reward: "#FFB020", // warm amber — celebration / highlights
        accent2: "#6C5CE7", // indigo — secondary info
        paper: "#FBFAF6", // warm off-white base
        focusink: "#0A1F1C", // deep teal-ink for the test "focus mode" surface
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "ring-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        // ── Student "game-feel" ambient motion (M-UI) ──
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shine: {
          "0%": { transform: "translateX(-120%) skewX(-20deg)" },
          "60%, 100%": { transform: "translateX(220%) skewX(-20deg)" },
        },
        "spark-glow": {
          "0%, 100%": { opacity: "0.5", transform: "scale(0.85)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        "timer-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.06)", opacity: "0.85" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "ring-pulse": "ring-pulse 1.8s ease-in-out infinite",
        "float-slow": "float-slow 3.2s ease-in-out infinite",
        shine: "shine 2.8s ease-in-out infinite",
        "spark-glow": "spark-glow 1.6s ease-in-out infinite",
        "timer-pulse": "timer-pulse 0.9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
