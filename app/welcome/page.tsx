/**
 * DriveScore — public marketing landing page (`/welcome`).
 *
 * A standalone, login-free sales page for coaching-centre owners (the buyers)
 * and parents (who must trust it). It is added to the middleware public
 * allowlist so it is never redirected to /login. It touches nothing in the app:
 * no DB, no auth, no engine — pure presentation.
 *
 * Architecture for speed: this is a SERVER component that renders mostly static
 * marketing HTML, with small CLIENT islands for motion (<Reveal>, <Neuro>) and
 * a CSS-only <AuroraBackground>. All motion is reduced-motion-safe.
 *
 * Copy honesty: no fabricated testimonials, school names, or statistics — only
 * value-based claims, plus one clearly-marked placeholder for the founder.
 */

import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Dices,
  Gauge,
  GraduationCap,
  Hourglass,
  Mail,
  ShieldCheck,
  Stethoscope,
  Users,
  CheckCircle2,
  EyeOff,
  Lock,
} from "lucide-react";
import { getCurrentUser, landingFor } from "@/lib/auth";
import { CinematicBackground } from "@/components/landing/CinematicBackground";
import { Reveal } from "@/components/landing/Reveal";
import { Parallax } from "@/components/landing/Parallax";
import { Neuro } from "@/components/mascot/Neuro";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/brand/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DriveScore — AI NEET mock analysis for coaching centres",
  description:
    "Auto-graded weekend NEET mocks with a diagnosis that explains WHY marks were lost — not just the score. Keep your faculty and brand; DriveScore is the AI brain underneath.",
};

// No backend needed — the primary action is a pre-filled email to the founder.
const CONTACT =
  "mailto:thigazhezhilanj007@gmail.com?subject=Bringing%20DriveScore%20to%20our%20coaching%20centre&body=Hi%2C%20I%20run%20a%20NEET%20coaching%20centre%20and%20I%27d%20like%20to%20learn%20more%20about%20DriveScore.%0A%0ACentre%20name%3A%0ACity%3A%0AApprox.%20students%3A%0A";

const DIAGNOSIS = [
  {
    icon: AlertTriangle,
    name: "Concept Gap",
    desc: "Genuinely didn't know it — flagged for re-teaching.",
    chip: "bg-[#FF5A4D]/15 text-[#FF9A91]",
    glow: "shadow-[0_0_30px_-6px_rgba(255,90,77,0.5)]",
    dot: "bg-[#FF5A4D]",
  },
  {
    icon: Gauge,
    name: "Careless Slip",
    desc: "Knew it, rushed it — easy marks left on the table.",
    chip: "bg-[#FFB020]/15 text-[#FFD27A]",
    glow: "shadow-[0_0_30px_-6px_rgba(255,176,32,0.5)]",
    dot: "bg-[#FFB020]",
  },
  {
    icon: Dices,
    name: "Guessing",
    desc: "Answered too fast to have actually worked it out.",
    chip: "bg-[#6C5CE7]/20 text-[#B7AEFF]",
    glow: "shadow-[0_0_30px_-6px_rgba(108,92,231,0.5)]",
    dot: "bg-[#6C5CE7]",
  },
  {
    icon: Hourglass,
    name: "Time Management",
    desc: "Ran out of time or left it blank — a pacing problem.",
    chip: "bg-energy/15 text-energy-soft",
    glow: "shadow-[0_0_30px_-6px_rgba(0,224,184,0.5)]",
    dot: "bg-energy",
  },
];

const REPORTS = [
  {
    icon: GraduationCap,
    who: "For the student",
    title: "Encouraging",
    desc: "What to fix next — framed as fixable habits and wins, never as failure.",
    accent: "text-energy-soft",
    ring: "ring-energy/30",
  },
  {
    icon: Stethoscope,
    who: "For the teacher",
    title: "Monday-ready",
    desc: "Exactly which chapters to re-teach, ranked by how many students struggled.",
    accent: "text-[#B7AEFF]",
    ring: "ring-[#6C5CE7]/30",
  },
  {
    icon: Users,
    who: "For the parent",
    title: "Reassuring",
    desc: "A clear, jargon-free WhatsApp-style update they actually understand.",
    accent: "text-[#FFD27A]",
    ring: "ring-[#FFB020]/30",
  },
];

const CENTRE_POINTS = [
  "Keep your faculty and your brand — DriveScore is the AI brain underneath, not a replacement.",
  "Save your teachers hours of manual grading every single weekend.",
  "Impress parents with professional, insightful reports — not just a number.",
  "Improve retention with progress that's visible and measurable.",
];

const PARENT_POINTS = [
  "See exactly where your child stands — their strengths and the specific gaps.",
  "No jargon: a simple, honest snapshot after every weekend mock.",
  "Built around effort and improvement — encouraging, never shaming.",
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "Private by design",
    desc: "Every student's data is isolated at the database level (row-level security) — one student can never see another's report.",
  },
  {
    icon: EyeOff,
    title: "Answer keys stay server-side",
    desc: "Keys never reach the browser. Students see the question and the 'why' — never the key.",
  },
  {
    icon: Lock,
    title: "Supervised mocks",
    desc: "Run weekend mocks at your centre, under your supervision, on any phone or tablet.",
  },
];

export default async function WelcomePage() {
  const me = await getCurrentUser();

  return (
    <main className="landing-skin relative min-h-screen overflow-x-hidden bg-[#06140f] text-paper">
      <CinematicBackground />

      <div className="relative z-10">
        {/* ── Nav ── */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#06140f]/70 backdrop-blur-md">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
            <Logo size={36} wordmarkClassName="text-lg text-paper" />
            <div className="flex items-center gap-2">
              <a
                href="#student-login"
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-paper/80 transition hover:bg-white/5 hover:text-paper"
              >
                Student Login
              </a>
              <a
                href={CONTACT}
                className="hidden rounded-xl bg-energy px-4 py-2 text-sm font-bold text-focusink shadow-[0_0_18px_-4px_rgba(0,224,184,0.7)] transition hover:-translate-y-0.5 sm:inline-flex"
              >
                Get in touch
              </a>
            </div>
          </nav>
        </header>

        {/* ── Hero ── */}
        <section className="mx-auto flex min-h-[88vh] max-w-4xl flex-col items-center justify-center px-5 pb-16 pt-10 text-center">
          <Parallax distance={44} className="mx-auto w-fit">
            <Reveal>
              <div className="relative mx-auto mb-2 w-fit">
                <div className="aurora-breathe absolute inset-0 -z-10 rounded-full bg-energy/25 blur-2xl" />
                <Neuro mood="welcome" size={132} />
              </div>
            </Reveal>
          </Parallax>

          <Reveal delay={0.05}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-energy/80">
              AI-powered NEET mock analysis
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Your teachers teach.
              <span className="mt-2 block">
                We make every weekend mock{" "}
                <span className="bg-gradient-to-r from-energy via-energy-soft to-reward bg-clip-text text-transparent">
                  count
                </span>
                .
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-paper/70 sm:text-lg">
              Auto-graded NEET mocks with a diagnosis that explains{" "}
              <strong className="text-paper">why</strong> marks were lost — concept
              gaps, careless slips, guessing and pacing — for every student, every week.
            </p>
          </Reveal>

          <Reveal delay={0.28}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <a href={CONTACT} className="btn-energy w-full sm:w-auto">
                Bring DriveScore to your centre
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#student-login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base font-semibold text-paper transition hover:bg-white/10 sm:w-auto"
              >
                Student Login <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>

          <div className="scroll-cue mt-16 flex flex-col items-center gap-1 text-paper/50">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">
              Scroll to discover
            </span>
            <ChevronDown className="h-5 w-5" />
          </div>
        </section>

        {/* ── The problem ── */}
        <Section eyebrow="The problem">
          <Reveal>
            <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              A score out of 720 tells you <span className="text-pop">what</span>.
              It never tells you <span className="text-energy">why</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { t: "Static tests", d: "The same paper, no insight into how each student actually solved it." },
                { t: "Hours of grading", d: "Faculty burn their weekends correcting sheets by hand." },
                { t: "Scores without meaning", d: "A number lands home — but nobody knows what to do next." },
              ].map((p) => (
                <div
                  key={p.t}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left"
                >
                  <p className="font-display text-lg font-bold text-paper">{p.t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{p.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Section>

        {/* ── What DriveScore does (the differentiator) ── */}
        <Section eyebrow="What DriveScore does">
          <Reveal>
            <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              We don&apos;t just grade the mock.{" "}
              <span className="bg-gradient-to-r from-energy to-reward bg-clip-text text-transparent">
                We diagnose it.
              </span>
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/70">
              Using per-question timing and answers, DriveScore sorts every lost
              mark into a clear cause — so a student (and their teacher) knows
              precisely what to work on next.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIAGNOSIS.map((d, i) => {
              const Icon = d.icon;
              return (
                <Reveal key={d.name} delay={i * 0.08}>
                  <div className={`group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06] ${d.glow}`}>
                    <div className={`grid h-11 w-11 place-items-center rounded-xl ${d.chip}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${d.dot}`} />
                      <h3 className="font-display font-bold text-paper">{d.name}</h3>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{d.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Section>

        {/* ── Three reports ── */}
        <Section eyebrow="Three reports, three audiences">
          <Reveal>
            <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              One mock. Three views that each land.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {REPORTS.map((r, i) => {
              const Icon = r.icon;
              return (
                <Reveal key={r.who} delay={i * 0.1}>
                  <div className={`h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 ring-1 ${r.ring}`}>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5">
                      <Icon className={`h-6 w-6 ${r.accent}`} />
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/45">
                      {r.who}
                    </p>
                    <h3 className={`mt-1 font-display text-xl font-extrabold ${r.accent}`}>
                      {r.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-paper/65">{r.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Section>

        {/* ── For coaching centres ── */}
        <Section eyebrow="For coaching centres">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Reveal>
                <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">
                  You keep the faculty.
                  <span className="block text-energy">We&apos;re the brain underneath.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <ul className="mt-7 grid gap-3.5">
                  {CENTRE_POINTS.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-energy" />
                      <span className="text-sm leading-relaxed text-paper/80">{p}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.18}>
                <a href={CONTACT} className="btn-energy mt-8 w-full sm:w-auto">
                  Bring DriveScore to your centre
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Reveal>
            </div>

            <Reveal delay={0.12} className="hidden lg:block">
              {/* Honest placeholder — clearly marked for the founder to fill in.
                  No fabricated numbers or testimonials. */}
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                <div className="aurora-breathe absolute -right-6 -top-6 h-28 w-28 rounded-full bg-energy/20 blur-2xl" />
                <div className="flex items-center justify-center">
                  <Neuro mood="cheer" size={120} />
                </div>
                <div className="mt-6 rounded-2xl border border-dashed border-energy/40 bg-energy/[0.04] p-5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-energy/80">
                    Your proof, here
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-paper/70">
                    [ Add your centre&apos;s results or a parent testimonial here once you have them — kept honest, no fake numbers. ]
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* ── For parents ── */}
        <Section eyebrow="For parents">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal className="order-2 lg:order-1">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                {/* WhatsApp-style mock update bubble */}
                <div className="flex items-center gap-2 text-paper/50">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Weekly update
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3 text-sm leading-relaxed text-paper/85">
                    This week&apos;s mock is in. Strongest in Biology 🌿. Most marks
                    slipped on a couple of <strong>careless</strong> Physics
                    questions — fixable with a slower second look.
                  </div>
                  <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-sm bg-energy/20 px-4 py-3 text-sm leading-relaxed text-paper">
                    Thank you! That&apos;s really clear 🙏
                  </div>
                </div>
                <p className="mt-4 text-center text-[11px] text-paper/40">
                  Illustrative example — not real student data.
                </p>
              </div>
            </Reveal>

            <div className="order-1 lg:order-2">
              <Reveal>
                <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">
                  Know exactly where your child stands.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <ul className="mt-7 grid gap-3.5">
                  {PARENT_POINTS.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-reward" />
                      <span className="text-sm leading-relaxed text-paper/80">{p}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </Section>

        {/* ── Trust ── */}
        <Section eyebrow="Trust & privacy">
          <Reveal>
            <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              Credible by construction.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {TRUST_POINTS.map((t, i) => {
              const Icon = t.icon;
              return (
                <Reveal key={t.title} delay={i * 0.1}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-energy/10 text-energy-soft">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-display font-bold text-paper">{t.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{t.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Section>

        {/* ── Final CTA ── */}
        <section className="px-5 py-24">
          <Reveal>
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-energy/20 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-6 py-14 text-center sm:px-12">
              <div className="aurora-breathe absolute left-1/2 top-0 -z-0 h-48 w-48 -translate-x-1/2 rounded-full bg-energy/25 blur-3xl" />
              <div className="relative z-10">
                <Parallax distance={36} className="mx-auto mb-5 w-fit">
                  <Neuro mood="welcome" size={96} />
                </Parallax>
                <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">
                  Make every weekend mock count.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-paper/70">
                  Bring DriveScore to your coaching centre — keep your faculty and
                  your brand, and give every student a diagnosis, not just a score.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <a href={CONTACT} className="btn-energy w-full sm:w-auto">
                    <Mail className="h-5 w-5" />
                    Bring DriveScore to your centre
                  </a>
                  <a
                    href="#student-login"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base font-semibold text-paper transition hover:bg-white/10 sm:w-auto"
                  >
                    Student Login <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Student Login ── */}
        <section id="student-login" className="px-5 py-20">
          <div className="mx-auto max-w-sm">
            <Reveal>
              <div className="mb-6 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-energy/80">
                  Student access
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold text-paper">
                  Sign in to take your mock
                </h2>
                <p className="mt-2 text-sm text-paper/55">
                  Your account is created by your coaching centre — no sign-up needed.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              {me ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-sm">
                  <p className="text-sm text-paper/70">
                    You&apos;re signed in as <span className="font-semibold text-energy">{me.profile.fullName ?? me.email}</span>.
                  </p>
                  <a
                    href={landingFor(me.profile.role)}
                    className="btn-energy mt-4 inline-flex"
                  >
                    Go to dashboard <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm">
                  <LoginForm embedded theme="dark" />
                </div>
              )}
            </Reveal>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 px-5 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex items-center gap-2.5">
              <Logo size={32} wordmarkClassName="text-base text-paper" />
              <p className="text-xs text-paper/45">
                Built for coaching centres.
              </p>
            </div>
            <div className="flex items-center gap-5 text-sm text-paper/60">
              <a href={CONTACT} className="inline-flex items-center gap-1.5 transition hover:text-paper">
                <Mail className="h-4 w-4" /> Contact
              </a>
              <a href="#student-login" className="transition hover:text-paper">
                Student Login
              </a>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-6xl text-center text-xs text-paper/35 sm:text-left">
            © {new Date().getFullYear()} DriveScore. Supervised weekend NEET mocks with per-student data privacy.
          </p>
        </footer>
      </div>
    </main>
  );
}

/** A section shell with a thin, letter-spaced uppercase eyebrow label. */
function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <div className="mb-7 flex items-center gap-3">
          <span className="h-px w-8 bg-energy/60" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-energy/80">
            {eyebrow}
          </span>
        </div>
      </Reveal>
      {children}
    </section>
  );
}
