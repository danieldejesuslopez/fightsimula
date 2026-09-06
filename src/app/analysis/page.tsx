"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Fight {
  id: string;
  status: string;
  fighterA: { id: string; name: string };
  fighterB: { id: string; name: string };
  method: string | null;
  winnerId: string | null;
}

interface Stats {
  strikesLanded: { a: number; b: number };
  heavyStrikes: { a: number; b: number };
  cleanStrikes: { a: number; b: number };
  takedowns: { a: number; b: number };
  submissionAttempts: { a: number; b: number };
  clinchBattles: number;
  controlTime: { a: number; b: number };
}

interface MomentumEntry {
  round: number;
  scoreA: number;
  scoreB: number;
  momentumA: number;
  momentumB: number;
  events: number;
}

interface KeyMoment {
  round: number;
  event: string;
  significance: string;
}

interface AnalysisData {
  fighterA: string;
  fighterB: string;
  stats: Stats;
  momentum: MomentumEntry[];
  keyMoments: KeyMoment[];
  totalRounds: number;
  method: string;
}

function ComparisonBar({ label, valA, valB, unitA, unitB }: { label: string; valA: number; valB: number; unitA?: string; unitB?: string }) {
  const max = Math.max(valA, valB, 1);
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-semibold ${valA >= valB ? "text-red-400" : "text-gray-500"}`}>{unitA || valA}</span>
        <span className="text-gray-600">{label}</span>
        <span className={`font-semibold ${valB >= valA ? "text-blue-400" : "text-gray-500"}`}>{unitB || valB}</span>
      </div>
      <div className="flex gap-1 h-3">
        <div className="flex-1 bg-[#1c2333] rounded-l-full overflow-hidden flex justify-end">
          <div className="bg-red-500/60 rounded-l-full transition-all" style={{ width: `${(valA / max) * 100}%` }} />
        </div>
        <div className="flex-1 bg-[#1c2333] rounded-r-full overflow-hidden">
          <div className="bg-blue-500/60 rounded-r-full transition-all" style={{ width: `${(valB / max) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AnalysisPage() {
  const [fights, setFights] = useState<Fight[]>([]);
  const [selectedFight, setSelectedFight] = useState<string>("");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/fights")
      .then(r => r.json())
      .then((d: Fight[]) => setFights(d.filter(f => f.status === "finished")));
  }, []);

  useEffect(() => {
    if (!selectedFight) { setData(null); return; }
    setLoading(true);
    fetch(`/api/analysis?fightId=${selectedFight}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedFight]);

  // Momentum chart SVG
  const renderMomentumChart = () => {
    if (!data || data.momentum.length === 0) return null;
    const w = 500, h = 160, pad = 30;
    const maxM = Math.max(...data.momentum.flatMap(m => [m.momentumA, m.momentumB]), 1);

    const toX = (i: number) => pad + (i / Math.max(data.momentum.length - 1, 1)) * (w - pad * 2);
    const toY = (v: number) => h - pad - (v / maxM) * (h - pad * 2);

    const pathA = data.momentum.map((m, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(m.momentumA)}`).join(" ");
    const pathB = data.momentum.map((m, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(m.momentumB)}`).join(" ");

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {/* Grid lines */}
        {data.momentum.map((m, i) => (
          <g key={i}>
            <line x1={toX(i)} y1={pad} x2={toX(i)} y2={h - pad} stroke="#1c2333" strokeWidth="1" />
            <text x={toX(i)} y={h - 10} textAnchor="middle" fill="#4b5563" fontSize="10">R{m.round}</text>
          </g>
        ))}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#1c2333" strokeWidth="1" />
        {/* Paths */}
        <path d={pathA} fill="none" stroke="#ef4444" strokeWidth="2.5" opacity="0.8" strokeLinejoin="round" />
        <path d={pathB} fill="none" stroke="#3b82f6" strokeWidth="2.5" opacity="0.8" strokeLinejoin="round" />
        {/* Dots */}
        {data.momentum.map((m, i) => (
          <g key={`dots-${i}`}>
            <circle cx={toX(i)} cy={toY(m.momentumA)} r="4" fill="#ef4444" />
            <circle cx={toX(i)} cy={toY(m.momentumB)} r="4" fill="#3b82f6" />
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Fight Analysis</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black mb-2">Post-Fight Analysis</h1>
          <p className="text-sm text-gray-500">Detailed statistical breakdown and fight flow analysis.</p>
        </div>

        {/* Fight selector */}
        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5 mb-6">
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Select Completed Fight</label>
          <select
            value={selectedFight}
            onChange={(e) => setSelectedFight(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm focus:outline-none focus:border-[#4ade80]/50"
          >
            <option value="">-- Choose a fight --</option>
            {fights.map(f => (
              <option key={f.id} value={f.id}>
                {f.fighterA.name} vs {f.fighterB.name} ({f.method})
              </option>
            ))}
          </select>
        </div>

        {loading && <div className="text-center py-16 text-gray-500">Analyzing fight data...</div>}

        {data && !loading && (
          <div className="space-y-6">
            {/* Stats comparison */}
            <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1">Fight Statistics</h3>
              <div className="flex justify-between text-xs text-gray-600 mb-4">
                <span className="text-red-400 font-semibold">{data.fighterA}</span>
                <span className="text-blue-400 font-semibold">{data.fighterB}</span>
              </div>
              <ComparisonBar label="Total Strikes" valA={data.stats.strikesLanded.a} valB={data.stats.strikesLanded.b} />
              <ComparisonBar label="Heavy Strikes" valA={data.stats.heavyStrikes.a} valB={data.stats.heavyStrikes.b} />
              <ComparisonBar label="Clean Strikes" valA={data.stats.cleanStrikes.a} valB={data.stats.cleanStrikes.b} />
              <ComparisonBar label="Takedowns" valA={data.stats.takedowns.a} valB={data.stats.takedowns.b} />
              <ComparisonBar label="Sub. Attempts" valA={data.stats.submissionAttempts.a} valB={data.stats.submissionAttempts.b} />
              <ComparisonBar
                label="Control Time"
                valA={data.stats.controlTime.a}
                valB={data.stats.controlTime.b}
                unitA={formatTime(data.stats.controlTime.a)}
                unitB={formatTime(data.stats.controlTime.b)}
              />
              <div className="text-center text-xs text-gray-600 mt-2">
                Clinch Battles: {data.stats.clinchBattles} | Total Rounds: {data.totalRounds} | Method: {data.method}
              </div>
            </div>

            {/* Momentum chart */}
            <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Fight Flow / Momentum</h3>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{data.fighterA}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{data.fighterB}</span>
              </div>
              {renderMomentumChart()}
            </div>

            {/* Round-by-round scores */}
            <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Round-by-Round Scores</h3>
              <div className="space-y-2">
                {data.momentum.map(m => {
                  const diff = m.scoreA - m.scoreB;
                  return (
                    <div key={m.round} className="flex items-center gap-3 bg-[#0d1117] rounded-xl p-3 border border-[#1c2333]">
                      <span className="text-sm font-bold w-10">R{m.round}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className={`text-sm font-bold ${diff > 0 ? "text-red-400" : "text-gray-500"}`}>{m.scoreA}</span>
                        <div className="flex-1 h-2 bg-[#1c2333] rounded-full overflow-hidden flex">
                          <div className="bg-red-500/60 transition-all" style={{ width: `${(m.scoreA / (m.scoreA + m.scoreB)) * 100}%` }} />
                          <div className="bg-blue-500/60 transition-all" style={{ width: `${(m.scoreB / (m.scoreA + m.scoreB)) * 100}%` }} />
                        </div>
                        <span className={`text-sm font-bold ${diff < 0 ? "text-blue-400" : "text-gray-500"}`}>{m.scoreB}</span>
                      </div>
                      <span className="text-[10px] text-gray-600 w-16 text-right">{m.events} events</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key moments */}
            {data.keyMoments.length > 0 && (
              <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Key Moments</h3>
                <div className="space-y-2">
                  {data.keyMoments.map((km, i) => (
                    <div key={i} className="flex items-start gap-3 bg-[#0d1117] rounded-xl p-3 border border-[#1c2333]">
                      <span className="text-xs text-gray-600 font-mono w-8 shrink-0">R{km.round}</span>
                      <div>
                        <p className="text-sm text-gray-300">{km.event}</p>
                        <p className="text-[10px] text-gray-600">{km.significance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedFight && !loading && (
          <div className="text-center py-16">
            <p className="text-gray-600 text-sm">Select a completed fight above to view the post-fight analysis.</p>
          </div>
        )}
      </main>
    </div>
  );
}
