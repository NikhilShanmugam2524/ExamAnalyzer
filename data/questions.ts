/**
 * Seed question bank for DriveScore.
 *
 * 18 original NEET-style questions (6 per subject, mixed difficulty), written
 * from standard NCERT Class 11–12 concepts. None are copied from any
 * commercial book.
 *
 * `parTimeSec` is a deliberate per-question budget — the Diagnosis Engine
 * uses it to decide TOO_SLOW / CARELESS, so the values are tuned so that all
 * four diagnosis categories are reachable in a normal sitting.
 *
 * The chosen `MOCK_QUESTION_IDS` below pick a fixed 9-question mock (3 per
 * subject) covering Easy/Medium/Hard so a grader can trigger every category.
 */

import type { Question } from "@/lib/types";

export const QUESTION_BANK: Question[] = [
  // ─────────────────────────── PHYSICS ───────────────────────────
  {
    id: "phy-1",
    subject: "Physics",
    chapter: "Ray Optics",
    concept: "Concave mirror image formation",
    difficulty: "Easy",
    parTimeSec: 45,
    text: "An object is placed at the centre of curvature C of a concave mirror. The image formed is:",
    options: [
      "Real, inverted, same size, at C",
      "Virtual, erect, magnified, behind the mirror",
      "Real, inverted, magnified, beyond C",
      "At infinity",
    ],
    answerIndex: 0,
  },
  {
    id: "phy-2",
    subject: "Physics",
    chapter: "Laws of Motion",
    concept: "Newton's second law / net force",
    difficulty: "Easy",
    parTimeSec: 50,
    text: "A 2 kg body accelerates at 3 m/s². The net force acting on it is:",
    options: ["1.5 N", "5 N", "6 N", "0.67 N"],
    answerIndex: 2,
  },
  {
    id: "phy-3",
    subject: "Physics",
    chapter: "Current Electricity",
    concept: "Resistors in parallel",
    difficulty: "Medium",
    parTimeSec: 75,
    text: "Two resistors of 6 Ω and 3 Ω are connected in parallel. Their equivalent resistance is:",
    options: ["9 Ω", "2 Ω", "4.5 Ω", "18 Ω"],
    answerIndex: 1,
  },
  {
    id: "phy-4",
    subject: "Physics",
    chapter: "Work, Energy and Power",
    concept: "Kinetic energy dependence on speed",
    difficulty: "Medium",
    parTimeSec: 70,
    text: "If the speed of a moving body is doubled, its kinetic energy becomes:",
    options: ["Unchanged", "Doubled", "Three times", "Four times"],
    answerIndex: 3,
  },
  {
    id: "phy-5",
    subject: "Physics",
    chapter: "Electromagnetic Induction",
    concept: "Lenz's law and induced current direction",
    difficulty: "Hard",
    parTimeSec: 95,
    text: "A bar magnet is pushed north-pole-first toward a coil. The induced current in the coil, viewed from the magnet side, flows so as to:",
    options: [
      "Make the near face a south pole, attracting the magnet",
      "Make the near face a north pole, opposing the magnet",
      "Flow only after the magnet stops",
      "Be zero because the magnet is permanent",
    ],
    answerIndex: 1,
  },
  {
    id: "phy-6",
    subject: "Physics",
    chapter: "Rotational Motion",
    concept: "Moment of inertia of a solid sphere",
    difficulty: "Hard",
    parTimeSec: 100,
    text: "The moment of inertia of a solid sphere of mass M and radius R about a diameter is:",
    options: [
      "(2/3) M R²",
      "(2/5) M R²",
      "(1/2) M R²",
      "M R²",
    ],
    answerIndex: 1,
  },

  // ────────────────────────── CHEMISTRY ──────────────────────────
  {
    id: "chem-1",
    subject: "Chemistry",
    chapter: "Some Basic Concepts of Chemistry",
    concept: "Mole concept / Avogadro number",
    difficulty: "Easy",
    parTimeSec: 50,
    text: "The number of atoms present in 1 mole of helium gas is approximately:",
    options: [
      "6.022 × 10²³",
      "3.011 × 10²³",
      "12.044 × 10²³",
      "1.0",
    ],
    answerIndex: 0,
  },
  {
    id: "chem-2",
    subject: "Chemistry",
    chapter: "Chemical Bonding",
    concept: "Shape from VSEPR theory",
    difficulty: "Easy",
    parTimeSec: 55,
    text: "According to VSEPR theory, the shape of a methane (CH₄) molecule is:",
    options: ["Square planar", "Trigonal planar", "Tetrahedral", "Pyramidal"],
    answerIndex: 2,
  },
  {
    id: "chem-3",
    subject: "Chemistry",
    chapter: "Equilibrium",
    concept: "pH of a strong acid solution",
    difficulty: "Medium",
    parTimeSec: 70,
    text: "The pH of a 0.001 M HCl solution (assume complete dissociation) is:",
    options: ["1", "2", "3", "11"],
    answerIndex: 2,
  },
  {
    id: "chem-4",
    subject: "Chemistry",
    chapter: "Periodic Classification",
    concept: "Trend in atomic radius across a period",
    difficulty: "Medium",
    parTimeSec: 65,
    text: "Across a period from left to right in the periodic table, the atomic radius generally:",
    options: [
      "Increases",
      "Decreases",
      "Stays constant",
      "First increases then decreases",
    ],
    answerIndex: 1,
  },
  {
    id: "chem-5",
    subject: "Chemistry",
    chapter: "Chemical Kinetics",
    concept: "Order of reaction from rate law",
    difficulty: "Hard",
    parTimeSec: 95,
    text: "For a reaction, rate = k[A]²[B]. The overall order of the reaction is:",
    options: ["1", "2", "3", "0"],
    answerIndex: 2,
  },
  {
    id: "chem-6",
    subject: "Chemistry",
    chapter: "Haloalkanes and Haloarenes",
    concept: "SN1 vs SN2 reactivity",
    difficulty: "Hard",
    parTimeSec: 100,
    text: "Which substrate reacts fastest by an SN1 mechanism?",
    options: [
      "Primary (1°) halide",
      "Methyl halide",
      "Tertiary (3°) halide",
      "Secondary (2°) halide",
    ],
    answerIndex: 2,
  },

  // ─────────────────────────── BIOLOGY ───────────────────────────
  {
    id: "bio-1",
    subject: "Biology",
    chapter: "Cell: The Unit of Life",
    concept: "Powerhouse of the cell",
    difficulty: "Easy",
    parTimeSec: 40,
    text: "Which organelle is known as the 'powerhouse of the cell'?",
    options: ["Ribosome", "Mitochondrion", "Golgi apparatus", "Lysosome"],
    answerIndex: 1,
  },
  {
    id: "bio-2",
    subject: "Biology",
    chapter: "Photosynthesis in Higher Plants",
    concept: "Site of the light reactions",
    difficulty: "Easy",
    parTimeSec: 45,
    text: "In a chloroplast, the light-dependent reactions of photosynthesis occur in the:",
    options: ["Stroma", "Thylakoid membranes", "Outer membrane", "Cytoplasm"],
    answerIndex: 1,
  },
  {
    id: "bio-3",
    subject: "Biology",
    chapter: "Principles of Inheritance",
    concept: "Monohybrid cross ratio",
    difficulty: "Medium",
    parTimeSec: 75,
    text: "In a typical monohybrid cross between two heterozygotes (Tt × Tt), the expected phenotypic ratio in the F₂ generation is:",
    options: ["1 : 1", "3 : 1", "9 : 3 : 3 : 1", "1 : 2 : 1"],
    answerIndex: 1,
  },
  {
    id: "bio-4",
    subject: "Biology",
    chapter: "Human Physiology: Breathing",
    concept: "Oxygen transport in blood",
    difficulty: "Medium",
    parTimeSec: 70,
    text: "The majority of oxygen is transported in human blood:",
    options: [
      "Dissolved in plasma",
      "Bound to haemoglobin as oxyhaemoglobin",
      "As bicarbonate ions",
      "Bound to white blood cells",
    ],
    answerIndex: 1,
  },
  {
    id: "bio-5",
    subject: "Biology",
    chapter: "Biomolecules",
    concept: "Enzyme active site specificity",
    difficulty: "Hard",
    parTimeSec: 90,
    text: "A competitive inhibitor slows an enzyme-catalysed reaction because it:",
    options: [
      "Binds the active site, competing with the substrate",
      "Permanently denatures the enzyme",
      "Raises the activation energy of the reaction",
      "Binds a site far from the active site, changing its shape",
    ],
    answerIndex: 0,
  },
  {
    id: "bio-6",
    subject: "Biology",
    chapter: "Molecular Basis of Inheritance",
    concept: "Central dogma / transcription",
    difficulty: "Hard",
    parTimeSec: 95,
    text: "During transcription in eukaryotes, the enzyme that synthesises messenger RNA (mRNA) is:",
    options: [
      "DNA polymerase",
      "RNA polymerase II",
      "Ligase",
      "Reverse transcriptase",
    ],
    answerIndex: 1,
  },
];

/**
 * The fixed mock set: 9 questions, 3 per subject, spanning Easy → Hard so a
 * grader can trigger every diagnosis category in one sitting.
 */
export const MOCK_QUESTION_IDS = [
  "phy-1", // Easy   — wrong here => CARELESS
  "phy-3", // Medium — wrong + slow => CONCEPT_GAP, or correct + slow => TOO_SLOW
  "phy-5", // Hard   — wrong => CONCEPT_GAP
  "chem-1", // Easy
  "chem-4", // Medium
  "chem-6", // Hard
  "bio-1", // Easy
  "bio-3", // Medium
  "bio-6", // Hard
];

/** Resolve the fixed mock set, preserving the order above. */
export function getMockQuestions(): Question[] {
  const byId = new Map(QUESTION_BANK.map((q) => [q.id, q]));
  return MOCK_QUESTION_IDS.map((id) => {
    const q = byId.get(id);
    if (!q) throw new Error(`Mock references unknown question id: ${id}`);
    return q;
  });
}

/** A small set of demo students for the Teacher batch view. */
export type DemoStudent = {
  id: string;
  name: string;
  className: string;
};

export const DEMO_STUDENTS: DemoStudent[] = [
  { id: "s1", name: "Aarav Menon", className: "NEET-2026 Batch A" },
  { id: "s2", name: "Diya Sharma", className: "NEET-2026 Batch A" },
  { id: "s3", name: "Karthik Rao", className: "NEET-2026 Batch A" },
];
