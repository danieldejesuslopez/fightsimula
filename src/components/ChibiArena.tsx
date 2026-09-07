"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ChibiArenaProps {
  nameA: string;
  nameB: string;
  colorA?: string;
  colorB?: string;
  events: string[];
  finish?: { winner: string; method: string } | null;
  playToken: number; // bump this to (re)play the current round's queued events
}

interface Chibi {
  root: THREE.Group;
  head: THREE.Mesh;
  torso: THREE.Mesh;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  baseX: number;
  facing: 1 | -1;
}

function buildChibi(skinColor: number, kitColor: number, facing: 1 | -1): Chibi {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshLambertMaterial({ color: skinColor, flatShading: true });
  const kitMat = new THREE.MeshLambertMaterial({ color: kitColor, flatShading: true });
  const gloveMat = new THREE.MeshLambertMaterial({ color: 0xff3333, flatShading: true });
  const shortsMat = new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true });

  // Big chibi head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), skinMat);
  head.position.y = 1.55;
  head.scale.set(1, 0.95, 0.9);
  root.add(head);

  // Small torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.5, 4, 8), kitMat);
  torso.position.y = 0.85;
  root.add(torso);

  // Shorts block
  const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.4), shortsMat);
  shorts.position.y = 0.5;
  root.add(shorts);

  function makeLimb(mat: THREE.Material, len: number, radius: number, endMat?: THREE.Material) {
    const g = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len, 4, 8), mat);
    limb.position.y = -len / 2 - radius;
    g.add(limb);
    if (endMat) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.3, 8, 8), endMat);
      cap.position.y = -len - radius;
      g.add(cap);
    }
    return g;
  }

  const armL = makeLimb(skinMat, 0.45, 0.14, gloveMat);
  armL.position.set(-0.42, 1.15, 0);
  root.add(armL);

  const armR = makeLimb(skinMat, 0.45, 0.14, gloveMat);
  armR.position.set(0.42, 1.15, 0);
  root.add(armR);

  const legL = makeLimb(skinMat, 0.5, 0.17);
  legL.position.set(-0.18, 0.4, 0);
  root.add(legL);

  const legR = makeLimb(skinMat, 0.5, 0.17);
  legR.position.set(0.18, 0.4, 0);
  root.add(legR);

  root.rotation.y = facing === 1 ? Math.PI / 2 : -Math.PI / 2;

  return { root, head, torso, armL, armR, legL, legR, baseX: 0, facing };
}

type Action =
  | { type: "idle" }
  | { type: "punch"; heavy: boolean; attacker: "A" | "B" }
  | { type: "takedown"; attacker: "A" | "B" }
  | { type: "clinch" }
  | { type: "knockout"; loser: "A" | "B" };

function parseEvent(evt: string, nameA: string): Action {
  const isA = evt.startsWith(nameA);
  if (evt.includes("heavy") && evt.includes("strike")) return { type: "punch", heavy: true, attacker: isA ? "A" : "B" };
  if (evt.includes("clean") && evt.includes("strike")) return { type: "punch", heavy: false, attacker: isA ? "A" : "B" };
  if (evt.includes("takedown")) return { type: "takedown", attacker: isA ? "A" : "B" };
  if (evt.includes("Clinch")) return { type: "clinch" };
  return { type: "idle" };
}

export default function ChibiArena({ nameA, nameB, colorA = "#ef4444", colorB = "#3b82f6", events, finish, playToken }: ChibiArenaProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<{
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
    fighterA: Chibi; fighterB: Chibi; raf: number; shake: number;
  } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = 320;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 4.2);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(2, 4, 3);
    scene.add(dir);

    // Cage floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3, 24),
      new THREE.MeshLambertMaterial({ color: 0x1c2333 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.9, 3, 32),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    const fighterA = buildChibi(0xf1c27d, new THREE.Color(colorA).getHex(), 1);
    fighterA.root.position.x = -1.1;
    fighterA.baseX = -1.1;
    scene.add(fighterA.root);

    const fighterB = buildChibi(0xc68642, new THREE.Color(colorB).getHex(), -1);
    fighterB.root.position.x = 1.1;
    fighterB.baseX = 1.1;
    scene.add(fighterB.root);

    let raf = 0;
    const clock = new THREE.Clock();
    stateRef.current = { scene, camera, renderer, fighterA, fighterB, raf, shake: 0 };

    const animate = () => {
      const t = clock.getElapsedTime();
      // idle bob
      [fighterA, fighterB].forEach((f, i) => {
        f.root.position.y = Math.sin(t * 2.4 + i) * 0.02;
      });
      if (stateRef.current && stateRef.current.shake > 0) {
        camera.position.x = (Math.random() - 0.5) * stateRef.current.shake;
        stateRef.current.shake *= 0.85;
        if (stateRef.current.shake < 0.001) { stateRef.current.shake = 0; camera.position.x = 0; }
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
      if (stateRef.current) stateRef.current.raf = raf;
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mount.innerHTML = "";
      stateRef.current = null;
    };
  }, [colorA, colorB]);

  // Play queued actions whenever playToken/events change
  useEffect(() => {
    const s = stateRef.current;
    if (!s || events.length === 0) return;

    const actions = events.map(e => parseEvent(e, nameA));
    let i = 0;

    const chibiFor = (side: "A" | "B") => (side === "A" ? s.fighterA : s.fighterB);

    function punchAnim(attacker: Chibi, defender: Chibi, heavy: boolean) {
      const dir = attacker.facing;
      const arm = attacker.facing === 1 ? attacker.armR : attacker.armL;
      const startX = attacker.root.position.x;
      const dur = heavy ? 260 : 160;
      const t0 = performance.now();
      function step() {
        const p = Math.min(1, (performance.now() - t0) / dur);
        const swing = Math.sin(p * Math.PI);
        arm.rotation.x = -swing * 1.8;
        attacker.root.position.x = startX + dir * swing * (heavy ? 0.35 : 0.2);
        if (p < 1) requestAnimationFrame(step);
        else {
          arm.rotation.x = 0;
          attacker.root.position.x = startX;
          if (s) s.shake = heavy ? 0.08 : 0.03;
          // defender reaction
          const dStartX = defender.root.position.x;
          defender.root.position.x = dStartX - dir * (heavy ? 0.15 : 0.06);
          setTimeout(() => { defender.root.position.x = dStartX; }, 150);
        }
      }
      step();
    }

    function takedownAnim(attacker: Chibi, defender: Chibi) {
      const dur = 500;
      const t0 = performance.now();
      const startY = defender.root.position.y;
      function step() {
        const p = Math.min(1, (performance.now() - t0) / dur);
        attacker.root.rotation.z = attacker.facing * p * 0.3;
        defender.root.rotation.z = -defender.facing * p * 1.1;
        defender.root.position.y = startY - p * 0.55;
        if (p < 1) requestAnimationFrame(step);
        else {
          if (s) s.shake = 0.1;
          setTimeout(() => {
            attacker.root.rotation.z = 0;
            defender.root.rotation.z = 0;
            defender.root.position.y = startY;
          }, 500);
        }
      }
      step();
    }

    function clinchAnim(a: Chibi, b: Chibi) {
      const aX = a.root.position.x, bX = b.root.position.x;
      const dur = 300;
      const t0 = performance.now();
      function step() {
        const p = Math.min(1, (performance.now() - t0) / dur);
        const push = Math.sin(p * Math.PI) * 0.15;
        a.root.position.x = aX + push;
        b.root.position.x = bX - push;
        if (p < 1) requestAnimationFrame(step);
        else { a.root.position.x = aX; b.root.position.x = bX; }
      }
      step();
    }

    function knockoutAnim(loser: Chibi) {
      const dur = 700;
      const t0 = performance.now();
      function step() {
        const p = Math.min(1, (performance.now() - t0) / dur);
        loser.root.rotation.z = loser.facing * p * (Math.PI / 2.2);
        loser.root.position.y = -p * 0.3;
        if (p < 1) requestAnimationFrame(step);
      }
      step();
      if (s) s.shake = 0.15;
    }

    function runNext() {
      if (i >= actions.length) {
        if (finish) {
          const loserSide = finish.winner === "A" ? "B" : "A";
          setTimeout(() => knockoutAnim(chibiFor(loserSide)), 200);
        }
        return;
      }
      const act = actions[i++];
      switch (act.type) {
        case "punch":
          punchAnim(chibiFor(act.attacker), chibiFor(act.attacker === "A" ? "B" : "A"), act.heavy);
          break;
        case "takedown":
          takedownAnim(chibiFor(act.attacker), chibiFor(act.attacker === "A" ? "B" : "A"));
          break;
        case "clinch":
          clinchAnim(s!.fighterA, s!.fighterB);
          break;
        default:
          break;
      }
      setTimeout(runNext, 550);
    }
    runNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken]);

  return (
    <div className="rounded-xl overflow-hidden border border-[#1c2333] bg-[#0d1117]">
      <div ref={mountRef} style={{ width: "100%", height: 320 }} />
      <div className="flex justify-between px-4 py-2 text-xs text-gray-500 bg-[#161b22]">
        <span style={{ color: colorA }}>{nameA}</span>
        <span className="text-gray-700">Chibi Arena</span>
        <span style={{ color: colorB }}>{nameB}</span>
      </div>
    </div>
  );
}
