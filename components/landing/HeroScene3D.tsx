"use client";

/**
 * The WebGL hero scene (react-three-fiber) — lazy-loaded, `ssr: false`.
 *
 * THEMED to what DriveScore actually is — a NEET/JEE prep tool — built from
 * abstract, light-based scientific structures (not clip-art) drifting in 3D
 * depth, mint glow on deep ink with rare amber sparks:
 *
 *   • DnaHelix    — a rotating double-helix of glowing points + base-pair rungs
 *                   (biology / NEET).
 *   • Molecules   — atom nodes joined by thin glowing bonds, each slowly
 *                   tumbling (chemistry).
 *   • NeuralNet   — scattered nodes wired by faint edges with amber sparks
 *                   travelling along them (the brain/synapse "DriveScore" theme).
 *   • Orbitals    — large, very faint orbital ellipse lines (physics / JEE),
 *                   read as texture, not literal formulae.
 *   • Motes       — a light flowing particle field for cinematic continuity.
 *
 * Motion: scroll dollies the camera + pushes the field back and fades it; the
 * cursor lerps the whole field + camera (mouse parallax). One shared glow
 * texture; all geometry is small instanced point/line buffers.
 *
 * Performance budget: DPR capped at 1.5 (+ drei <AdaptiveDpr/>), render loop
 * PAUSES when the tab is hidden or the hero is scrolled past, the shared GPU
 * texture is disposed on unmount. SSR-safe (no browser globals at module top;
 * the only `document` use is in a client-only callback, module is `ssr:false`).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import * as THREE from "three";

/** A soft radial glow sprite, generated on a 2D canvas (client-only). */
function makeGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const MINT = "#00E0B8";
const MINT_SOFT = "#7CF0DD";
const AMBER = "#FFB020";
const TEAL = "#0d9488";

type MotifProps = { tex: THREE.Texture; reduce: boolean };

/* ── DNA double-helix (biology) ─────────────────────────────────────────── */
function DnaHelix({ tex, reduce }: MotifProps) {
  const group = useRef<THREE.Group>(null);
  const { strandPos, strandCol, rungs } = useMemo(() => {
    const TURNS = 5;
    const PER_TURN = 24;
    const R = 1.15;
    const H = 8.5;
    const N = TURNS * PER_TURN;
    const strandPos = new Float32Array(N * 2 * 3);
    const strandCol = new Float32Array(N * 2 * 3);
    const rung: number[] = [];
    const a = new THREE.Color(MINT);
    const b = new THREE.Color(MINT_SOFT);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const ang = t * TURNS * Math.PI * 2;
      const y = (t - 0.5) * H;
      const ax = Math.cos(ang) * R;
      const az = Math.sin(ang) * R;
      const bx = Math.cos(ang + Math.PI) * R;
      const bz = Math.sin(ang + Math.PI) * R;
      strandPos.set([ax, y, az, bx, y, bz], i * 6);
      strandCol.set([a.r, a.g, a.b, b.r, b.g, b.b], i * 6);
      if (i % 2 === 0) rung.push(ax, y, az, bx, y, bz); // base pairs
    }
    return { strandPos, strandCol, rungs: new Float32Array(rung) };
  }, []);

  useFrame((_, d) => {
    if (group.current && !reduce) group.current.rotation.y += Math.min(d, 0.05) * 0.28;
  });

  return (
    <group ref={group} position={[-3.4, 0, -3]} rotation={[0, 0, 0.2]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[strandPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[strandCol, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.14}
          map={tex}
          vertexColors
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[rungs, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={MINT}
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

/* ── Molecules (chemistry) ──────────────────────────────────────────────── */
function Molecules({ tex, reduce }: MotifProps) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const mols = useMemo(() => {
    // Atoms placed on a fibonacci sphere around a centre; bonds to the centre.
    const build = (center: [number, number, number], n: number, spread: number, amber: boolean) => {
      const atoms: number[][] = [[0, 0, 0]];
      for (let k = 0; k < n; k++) {
        const phi = Math.acos(1 - (2 * (k + 0.5)) / n);
        const theta = Math.PI * (1 + Math.sqrt(5)) * k;
        atoms.push([
          Math.cos(theta) * Math.sin(phi) * spread,
          Math.cos(phi) * spread,
          Math.sin(theta) * Math.sin(phi) * spread,
        ]);
      }
      const bond: number[] = [];
      for (let k = 1; k < atoms.length; k++) bond.push(...atoms[0], ...atoms[k]);
      return {
        center,
        amber,
        atomPos: new Float32Array(atoms.flat()),
        bondPos: new Float32Array(bond),
      };
    };
    return [
      build([3.4, 1.7, -5], 4, 0.85, false),
      build([4.4, -1.9, -7], 3, 0.7, true),
      build([1.5, 2.6, -8.5], 5, 0.95, false),
      build([-4.6, 2.1, -6], 4, 0.78, false),
    ];
  }, []);

  useFrame((_, d) => {
    if (reduce) return;
    const dd = Math.min(d, 0.05);
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.y += dd * (0.22 + i * 0.05);
      g.rotation.x += dd * 0.12;
    });
  });

  return (
    <>
      {mols.map((m, i) => (
        <group
          key={i}
          position={m.center}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[m.atomPos, 3]} />
            </bufferGeometry>
            <pointsMaterial
              size={0.24}
              map={tex}
              color={m.amber ? AMBER : MINT_SOFT}
              transparent
              opacity={0.9}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              sizeAttenuation
            />
          </points>
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[m.bondPos, 3]} />
            </bufferGeometry>
            <lineBasicMaterial
              color={MINT}
              transparent
              opacity={0.22}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </lineSegments>
        </group>
      ))}
    </>
  );
}

/* ── Neural network (synapse theme) ─────────────────────────────────────── */
function NeuralNet({ tex, reduce }: MotifProps) {
  const sparkRef = useRef<THREE.Points>(null);
  const { nodePos, nodeCol, edgePos, edges, pts } = useMemo(() => {
    const NODES = 32;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < NODES; i++) {
      pts.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 8.5,
          -4 - Math.random() * 7,
        ),
      );
    }
    const nodePos = new Float32Array(NODES * 3);
    const nodeCol = new Float32Array(NODES * 3);
    const cA = new THREE.Color(MINT);
    const cB = new THREE.Color(MINT_SOFT);
    pts.forEach((p, i) => {
      nodePos.set([p.x, p.y, p.z], i * 3);
      const c = Math.random() < 0.5 ? cA : cB;
      nodeCol.set([c.r, c.g, c.b], i * 3);
    });
    const edges: [number, number][] = [];
    for (let i = 0; i < NODES; i++) {
      const near = pts
        .map((q, j) => ({ j, d: pts[i].distanceTo(q) }))
        .filter((o) => o.j !== i)
        .sort((x, y) => x.d - y.d);
      for (let k = 0; k < 2; k++) {
        const j = near[k].j;
        if (near[k].d < 6.5 && !edges.some((e) => e[0] === j && e[1] === i)) {
          edges.push([i, j]);
        }
      }
    }
    const edgePos = new Float32Array(edges.length * 6);
    edges.forEach((e, idx) => {
      const a = pts[e[0]];
      const b = pts[e[1]];
      edgePos.set([a.x, a.y, a.z, b.x, b.y, b.z], idx * 6);
    });
    return { nodePos, nodeCol, edgePos, edges, pts };
  }, []);

  // Amber sparks travelling along edges (synaptic signals).
  const SPARKS = 14;
  const sparks = useMemo(() => {
    const arr = new Float32Array(SPARKS * 3);
    const meta = Array.from({ length: SPARKS }, () => ({
      e: Math.floor(Math.random() * Math.max(1, edges.length)),
      t: Math.random(),
      speed: 0.18 + Math.random() * 0.28,
    }));
    // seed initial positions so the reduced-motion (static) case looks right
    meta.forEach((m, i) => {
      const e = edges[m.e];
      if (!e) return;
      const a = pts[e[0]];
      const b = pts[e[1]];
      arr.set([a.x + (b.x - a.x) * m.t, a.y + (b.y - a.y) * m.t, a.z + (b.z - a.z) * m.t], i * 3);
    });
    return { arr, meta };
  }, [edges, pts]);

  useFrame((_, d) => {
    if (reduce || edges.length === 0) return;
    const dd = Math.min(d, 0.05);
    const { arr, meta } = sparks;
    meta.forEach((m, i) => {
      m.t += m.speed * dd;
      if (m.t > 1) {
        m.t = 0;
        m.e = Math.floor(Math.random() * edges.length);
      }
      const e = edges[m.e];
      const a = pts[e[0]];
      const b = pts[e[1]];
      arr.set([a.x + (b.x - a.x) * m.t, a.y + (b.y - a.y) * m.t, a.z + (b.z - a.z) * m.t], i * 3);
    });
    if (sparkRef.current) {
      (sparkRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return (
    <group>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePos, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={MINT}
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePos, 3]} />
          <bufferAttribute attach="attributes-color" args={[nodeCol, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          map={tex}
          vertexColors
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      <points ref={sparkRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparks.arr, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.32}
          map={tex}
          color={AMBER}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

/* ── Orbital ellipse lines (physics / JEE texture) ──────────────────────── */
function Orbitals({ reduce }: { reduce: boolean }) {
  const group = useRef<THREE.Group>(null);
  const rings = useMemo(() => {
    const ellipse = (rx: number, ry: number, seg = 80) => {
      const a = new Float32Array(seg * 3);
      for (let i = 0; i < seg; i++) {
        const t = (i / seg) * Math.PI * 2;
        a.set([Math.cos(t) * rx, Math.sin(t) * ry, 0], i * 3);
      }
      return a;
    };
    return [
      { pos: ellipse(6, 3.4), rot: [0.4, 0.2, 0] as [number, number, number] },
      { pos: ellipse(4.5, 4.5), rot: [1.1, 0.6, 0.3] as [number, number, number] },
      { pos: ellipse(7.6, 2.2), rot: [-0.5, 0.9, 0.2] as [number, number, number] },
    ];
  }, []);

  useFrame((_, d) => {
    if (group.current && !reduce) group.current.rotation.z += Math.min(d, 0.05) * 0.04;
  });

  return (
    <group ref={group} position={[0, 0, -11]}>
      {rings.map((r, i) => (
        <lineLoop key={i} rotation={r.rot}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[r.pos, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color={i === 1 ? TEAL : MINT}
            transparent
            opacity={0.07}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineLoop>
      ))}
    </group>
  );
}

/* ── Ambient flowing motes (cinematic continuity) ───────────────────────── */
const Z_NEAR = 3;
const Z_FAR = -16;
function Motes({ tex }: { tex: THREE.Texture }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 520;
  const data = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions.set(
        [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 12,
          THREE.MathUtils.lerp(Z_FAR, Z_NEAR, Math.random()),
        ],
        i * 3,
      );
      speeds[i] = 0.4 + Math.random() * 0.7;
    }
    return { positions, speeds };
  }, []);

  useFrame((_, d) => {
    const dd = Math.min(d, 0.05);
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      let z = arr[i * 3 + 2] + data.speeds[i] * 0.9 * dd;
      if (z > Z_NEAR) z = Z_FAR + (z - Z_NEAR);
      arr[i * 3 + 2] = z;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        map={tex}
        color={MINT}
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/* ── A few big soft glows for ambient "bloom" ───────────────────────────── */
function GlowSprites({ tex }: { tex: THREE.Texture }) {
  const sprites = useMemo(
    () => [
      { p: [-3, 1.2, -4], s: 6, c: MINT, o: 0.16 },
      { p: [3, -1, -6], s: 7, c: TEAL, o: 0.14 },
      { p: [0.6, 2, -8.5], s: 8, c: AMBER, o: 0.05 },
    ],
    [],
  );
  return (
    <>
      {sprites.map((sp, i) => (
        <sprite key={i} position={sp.p as [number, number, number]} scale={[sp.s, sp.s, 1]}>
          <spriteMaterial
            map={tex}
            color={sp.c}
            transparent
            opacity={sp.o}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </>
  );
}

/** Rig that applies scroll dolly + mouse parallax every frame. */
function ParallaxRig({
  scroll,
  reduce,
  children,
}: {
  scroll: React.MutableRefObject<number>;
  reduce: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const k = Math.min(1, d * 3);
    const p = scroll.current;
    const px = reduce ? 0 : state.pointer.x;
    const py = reduce ? 0 : state.pointer.y;

    if (group.current) {
      group.current.rotation.y += (px * 0.28 - group.current.rotation.y) * k;
      group.current.rotation.x += (-py * 0.18 - group.current.rotation.x) * k;
      group.current.position.z += (-p * 4 - group.current.position.z) * k; // push back on scroll
    }

    camera.position.z += (7 - p * 3.2 - camera.position.z) * k;
    camera.position.x += (px * 0.5 - camera.position.x) * Math.min(1, d * 2);
    camera.position.y += (py * 0.4 - camera.position.y) * Math.min(1, d * 2);
    camera.lookAt(0, 0, 0);
  });

  return <group ref={group}>{children}</group>;
}

export default function HeroScene3D() {
  const reduce = !!useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scroll = useRef(0);
  const [running, setRunning] = useState(true);

  const glow = useMemo(() => makeGlowTexture(), []);
  useEffect(() => () => glow.dispose(), [glow]);

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.12]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    scroll.current = v;
    const should = v < 0.55 && !document.hidden;
    setRunning((prev) => (should === prev ? prev : should));
  });

  useEffect(() => {
    const onVis = () => setRunning(!document.hidden && scroll.current < 0.55);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {/* Deep base so the 3D fully covers the CSS-aurora fallback when active. */}
      <div className="absolute inset-0 bg-[#06140f]" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,#0c2b24_0%,#06140f_62%)]" />

      <motion.div className="absolute inset-0" style={{ opacity }}>
        <Canvas
          className="!absolute inset-0"
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 7], fov: 60 }}
          frameloop={running ? "always" : "never"}
        >
          <AdaptiveDpr />
          <fogExp2 attach="fog" args={["#06140f", 0.08]} />
          <ParallaxRig scroll={scroll} reduce={reduce}>
            <Orbitals reduce={reduce} />
            <NeuralNet tex={glow} reduce={reduce} />
            <Molecules tex={glow} reduce={reduce} />
            <DnaHelix tex={glow} reduce={reduce} />
            <Motes tex={glow} />
            <GlowSprites tex={glow} />
          </ParallaxRig>
        </Canvas>
      </motion.div>

      {/* Vignette + bottom fade to match the brand grounding. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_28%,transparent_42%,rgba(3,10,8,0.66)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-[#04100c]" />
    </motion.div>
  );
}
