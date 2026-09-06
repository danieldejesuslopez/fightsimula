"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const WEIGHT_CLASSES = [
  { label: "Flyweight", kg: 57 },
  { label: "Bantamweight", kg: 61 },
  { label: "Featherweight", kg: 66 },
  { label: "Lightweight", kg: 70 },
  { label: "Welterweight", kg: 77 },
  { label: "Middleweight", kg: 84 },
  { label: "Light Heavyweight", kg: 93 },
  { label: "Heavyweight", kg: 105 },
];

const STYLES = ["Striker", "Grappler", "Balanced"];
const STAT_BUDGET = 350;

const STYLE_COLORS: Record<string, string> = {
  Striker: "#ef4444",
  Grappler: "#3b82f6",
  Balanced: "#a855f7",
};

function calcOverall(stats: Record<string, number>) {
  const vals = Object.values(stats);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function estimateElo(overall: number) {
  return 1500 + Math.round((overall - 50) * 5);
}

function RadarChart({ stats }: { stats: Record<string, number> }) {
  const keys = Object.keys(stats);
  const n = keys.length;
  const cx = 120, cy = 120, r = 90;

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  function point(i: number, value: number) {
    const angle = startAngle + i * angleStep;
    const dist = (value / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  }

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
      {/* Grid */}
      {gridLevels.map((level) => {
        const pts = keys.map((_, i) => {
          const p = point(i, level);
          return `${p.x},${p.y}`;
        }).join(" ");
        return <polygon key={level} points={pts} fill="none" stroke="#1c2333" strokeWidth="1" />;
      })}
      {/* Axes */}
      {keys.map((_, i) => {
        const p = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#1c2333" strokeWidth="1" />;
      })}
      {/* Data polygon */}
      <polygon
        points={keys.map((k, i) => {
          const p = point(i, stats[k]);
          return `${p.x},${p.y}`;
        }).join(" ")}
        fill="rgba(74, 222, 128, 0.15)"
        stroke="#4ade80"
        strokeWidth="2"
      />
      {/* Dots + Labels */}
      {keys.map((k, i) => {
        const p = point(i, stats[k]);
        const lp = point(i, 115);
        return (
          <g key={k}>
            <circle cx={p.x} cy={p.y} r="3" fill="#4ade80" />
            <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize="10" fontWeight="bold">
              {k.slice(0, 3).toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function CreateFighterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [style, setStyle] = useState("Balanced");
  const [weight, setWeight] = useState(77);
  const [height, setHeight] = useState(180);
  const [reach, setReach] = useState(185);
  const [stats, setStats] = useState({
    striking: 70,
    grappling: 70,
    cardio: 70,
    chin: 70,
    speed: 70,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalUsed = Object.values(stats).reduce((a, b) => a + b, 0);
  const remaining = STAT_BUDGET - totalUsed;
  const overall = calcOverall(stats);
  const elo = estimateElo(overall);

  function setStat(key: string, value: number) {
    const other = totalUsed - stats[key as keyof typeof stats];
    const clamped = Math.min(value, STAT_BUDGET - other);
    setStats((prev) => ({ ...prev, [key]: Math.max(0, clamped) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (remaining < 0) { setError("Over stat budget"); return; }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/fighters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), nickname: nickname.trim(), style, weight, height, reach, ...stats }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create fighter");
        setSubmitting(false);
        return;
      }
      const fighter = await res.json();
      router.push(`/fighter/${fighter.id}`);
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  const weightLabel = WEIGHT_CLASSES.find((w) => w.kg === weight)?.label || "";

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">&rsaquo;</span>
          <span className="text-sm text-gray-400">Fighter Builder</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">Fighter Builder &mdash; Create Your Champion</h1>
        <p className="text-gray-500 text-sm mb-8">Design a custom fighter with your own stats and style</p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form — left 3 cols */}
          <div className="lg:col-span-3 space-y-6">
            {/* Identity */}
            <section className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6 space-y-4">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Identity</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name *</label>
                  <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#1c2333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4ade80] transition"
                    placeholder="Fighter name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nickname</label>
                  <input
                    value={nickname} onChange={(e) => setNickname(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#1c2333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4ade80] transition"
                    placeholder='"The Destroyer"'
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Style</label>
                  <select
                    value={style} onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#1c2333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4ade80] transition"
                  >
                    {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Weight Class</label>
                  <select
                    value={weight} onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full bg-[#0d1117] border border-[#1c2333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4ade80] transition"
                  >
                    {WEIGHT_CLASSES.map((w) => <option key={w.kg} value={w.kg}>{w.label} ({w.kg}kg)</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Physical */}
            <section className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6 space-y-4">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Physical</h2>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Height</span>
                  <span className="text-white font-bold">{height} cm</span>
                </div>
                <input type="range" min={160} max={200} value={height} onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full accent-[#4ade80]" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Reach</span>
                  <span className="text-white font-bold">{reach} cm</span>
                </div>
                <input type="range" min={160} max={210} value={reach} onChange={(e) => setReach(Number(e.target.value))}
                  className="w-full accent-[#4ade80]" />
              </div>
            </section>

            {/* Stats */}
            <section className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Stats</h2>
                <div className={`text-sm font-bold ${remaining < 0 ? "text-red-400" : remaining === 0 ? "text-yellow-400" : "text-[#4ade80]"}`}>
                  {remaining} pts remaining
                </div>
              </div>

              {Object.entries(stats).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 capitalize">{key}</span>
                    <span className={`font-bold ${value >= 85 ? "text-[#4ade80]" : value >= 70 ? "text-white" : "text-gray-500"}`}>{value}</span>
                  </div>
                  <input type="range" min={0} max={100} value={value} onChange={(e) => setStat(key, Number(e.target.value))}
                    className="w-full accent-[#4ade80]" />
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t border-[#1c2333]">
                <span className="text-xs text-gray-500">Total Used</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-[#0d1117] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${remaining < 0 ? "bg-red-500" : "bg-[#4ade80]"}`}
                      style={{ width: `${Math.min(100, (totalUsed / STAT_BUDGET) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-400">{totalUsed}/{STAT_BUDGET}</span>
                </div>
              </div>
            </section>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !name.trim() || remaining < 0}
              className="w-full py-3 rounded-xl font-bold text-sm bg-[#4ade80] text-[#0d1117] hover:bg-[#22c55e] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {submitting ? "Creating..." : "Create Fighter"}
            </button>
          </div>

          {/* Preview — right 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fighter Card */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6 sticky top-20">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Live Preview</h2>

              {/* Avatar + Name */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${STYLE_COLORS[style]}20`, border: `2px solid ${STYLE_COLORS[style]}40` }}
                >
                  🥊
                </div>
                <div>
                  <p className="font-black text-lg">{name || "Your Fighter"}</p>
                  {nickname && <p className="text-xs text-gray-500">&ldquo;{nickname}&rdquo;</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${STYLE_COLORS[style]}20`, color: STYLE_COLORS[style] }}>
                      {style}
                    </span>
                    <span className="text-[10px] text-gray-600">{weightLabel} &middot; {height}cm</span>
                  </div>
                </div>
              </div>

              {/* Overall Rating */}
              <div className="text-center mb-4 py-3 bg-[#0d1117] rounded-xl border border-[#1c2333]">
                <p className="text-4xl font-black text-[#4ade80]">{overall}</p>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">Overall Rating</p>
              </div>

              {/* Radar Chart */}
              <RadarChart stats={stats} />

              {/* Stat Bars */}
              <div className="space-y-2 mt-4">
                {Object.entries(stats).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 uppercase w-12 text-right">{key.slice(0, 3)}</span>
                    <div className="flex-1 h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${value}%`,
                          backgroundColor: value >= 85 ? "#4ade80" : value >= 70 ? "#facc15" : value >= 50 ? "#f97316" : "#ef4444",
                        }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-8 text-right ${value >= 85 ? "text-[#4ade80]" : "text-gray-400"}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Estimated ELO */}
              <div className="mt-4 pt-4 border-t border-[#1c2333] flex items-center justify-between">
                <span className="text-xs text-gray-500">Estimated ELO</span>
                <span className="text-lg font-black text-[#4ade80]">{elo}</span>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
