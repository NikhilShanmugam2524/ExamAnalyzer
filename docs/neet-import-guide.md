# NEET Question Bank — Collection & Import Guide

This guide is for building the **DriveScore global question bank** (the pool that
powers student lesson practice + full NEET mocks at `/practice`). Collect
questions into one spreadsheet using the columns below, then an admin uploads it
at **`/admin/bank` → Bulk import (CSV)**.

> Template file: [`neet-questions-template.csv`](./neet-questions-template.csv)

---

## 1. Where to get the papers

- **Official & free:** NTA NEET site — past question papers + **official answer
  keys** are published each year (search "NTA NEET previous year question paper"
  / "NEET official answer key <year>"). The official key is what you should
  trust for `correct_option`.
- **Faster (paid):** several ed-tech vendors sell **already-tagged** NEET
  question banks in Excel (subject/chapter/difficulty + answers). If budget
  allows, this skips most of the manual tagging below and is the quickest route
  to a large, clean bank.

**Copyright note:** NEET papers are NTA's content. Past-paper reproduction is
common, but for a **commercial** product confirm you're allowed to redistribute
them (or use a licensed/vendor dataset, or rewrite questions in your own words).

---

## 2. The CSV format (exact columns)

| Column | Required | Notes |
|---|---|---|
| `subject` | ✅ | Exactly one of: `Physics`, `Chemistry`, `Biology` |
| `chapter` | ✅ | The lesson — **use the NCERT chapter names in §4** so practice groups cleanly |
| `concept` | ✅ | The specific idea tested (free text, e.g. "Newton's second law") |
| `difficulty` | ✅ | One of: `Easy`, `Medium`, `Hard` |
| `par_time_sec` | ✅ | Expected solve time in seconds (see §3) — **drives the diagnosis** |
| `question_text` | ✅ | The question, plain text (see §5 on images/symbols) |
| `option_a`..`option_d` | ✅ | The four options |
| `correct_option` | ✅ | `A`, `B`, `C`, or `D` (from the **official answer key**) |

The importer validates every row and shows a per-row preview; invalid rows are
flagged and skipped, valid ones import. You can upload in batches (up to a few
thousand rows per file).

---

## 3. Tagging rules (these power the 5-way diagnosis)

The diagnosis engine reads `chapter`, `concept`, `difficulty`, and
`par_time_sec` — so accurate tags = accurate reports.

- **`par_time_sec`** — NEET is ~180–200 questions in ~200 min, so ~60s average.
  Guide: Easy `30–45`, Medium `60–90`, Hard `90–150`.
- **`difficulty`** — your honest judgement. (Used for the "Careless" diagnosis:
  a wrong answer on an *Easy* question = careless, not a concept gap.)
- **`chapter`** — pick from the canonical list in §4 so the same lesson isn't
  split into "Optics" / "Ray Optics" / "ray optics". Consistency here is what
  makes the lesson-by-lesson practice list clean.

---

## 4. Canonical chapter names (NCERT — use these verbatim)

### Physics
Physical World; Units and Measurements; Motion in a Straight Line; Motion in a
Plane; Laws of Motion; Work, Energy and Power; System of Particles and
Rotational Motion; Gravitation; Mechanical Properties of Solids; Mechanical
Properties of Fluids; Thermal Properties of Matter; Thermodynamics; Kinetic
Theory; Oscillations; Waves; Electric Charges and Fields; Electrostatic
Potential and Capacitance; Current Electricity; Moving Charges and Magnetism;
Magnetism and Matter; Electromagnetic Induction; Alternating Current;
Electromagnetic Waves; Ray Optics and Optical Instruments; Wave Optics; Dual
Nature of Radiation and Matter; Atoms; Nuclei; Semiconductor Electronics.

### Chemistry
Some Basic Concepts of Chemistry; Structure of Atom; Classification of Elements
and Periodicity; Chemical Bonding and Molecular Structure; States of Matter;
Thermodynamics; Equilibrium; Redox Reactions; Hydrogen; The s-Block Elements;
The p-Block Elements; Organic Chemistry – Some Basic Principles and Techniques;
Hydrocarbons; Environmental Chemistry; The Solid State; Solutions;
Electrochemistry; Chemical Kinetics; Surface Chemistry; General Principles and
Processes of Isolation of Elements; The p-Block Elements (12th); The d- and
f-Block Elements; Coordination Compounds; Haloalkanes and Haloarenes; Alcohols,
Phenols and Ethers; Aldehydes, Ketones and Carboxylic Acids; Amines;
Biomolecules; Polymers; Chemistry in Everyday Life.

### Biology
The Living World; Biological Classification; Plant Kingdom; Animal Kingdom;
Morphology of Flowering Plants; Anatomy of Flowering Plants; Structural
Organisation in Animals; Cell: The Unit of Life; Biomolecules; Cell Cycle and
Cell Division; Transport in Plants; Mineral Nutrition; Photosynthesis in Higher
Plants; Respiration in Plants; Plant Growth and Development; Digestion and
Absorption; Breathing and Exchange of Gases; Body Fluids and Circulation;
Excretory Products and their Elimination; Locomotion and Movement; Neural
Control and Coordination; Chemical Coordination and Integration; Reproduction in
Organisms; Sexual Reproduction in Flowering Plants; Human Reproduction;
Reproductive Health; Principles of Inheritance and Variation; Molecular Basis of
Inheritance; Evolution; Human Health and Disease; Strategies for Enhancement in
Food Production; Microbes in Human Welfare; Biotechnology – Principles and
Processes; Biotechnology and its Applications; Organisms and Populations;
Ecosystem; Biodiversity and Conservation; Environmental Issues.

---

## 5. Known limitations (plan around these)

- **No images/diagrams.** `question_text` is plain text — questions that depend
  on a figure, graph, or circuit diagram can't be represented yet. Either skip
  them, or rewrite as text where possible. (Image support would need a schema +
  upload change — tell me if you want that built.)
- **Symbols/formulae** are plain text: write `H2O`, `6.022x10^23`, `m/s^2`,
  `CO2`, etc. No subscript/superscript rendering yet.
- **Assertion–Reason / match-the-column** question types fit the 4-option format
  but read awkwardly — fine to include, just check the wording.

---

## 6. Workflow summary

1. Download official papers + answer keys (or buy a tagged dataset).
2. Fill the template — one row per question, text-only, tag chapter/difficulty.
3. Admin → `/admin/bank` → Bulk import (CSV) → review preview → import.
4. Questions appear instantly in student `/practice` (lessons + full mock) and
   results flow to the teacher's Practice activity view.
