"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Fighter {
  id: string;
  name: string;
  style: string;
}

interface SimResult {
  fighterA: { id: string; name: string; style: string };
  fighterB: { id: string; name: string; style: string };
  count: number;
  winsA: number;
  winsB: number;
  draws: number;
  winPctA: number;
  winPctB: number;
  drawPct: number;
  methods: {
    fighterA: { ko: number; sub: number; dec: number };
    fighterB: { ko: number; sub: number; dec: number };
  };
  avgRounds: number;
  roundDistribution: Record<string, number>;
  impliedOdds: { fairA: number; fairB: number };
}

export default function SimulateLabPage() {
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [fighterAId, setFighterAId] = useState("");
  const [fighterBId, setFighterBId] = useState("");
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetch("/api/fighters")
      .then((r) => r.json())
      .then(setFighters)
      .catch(() => {});
  }, []);

  async function runSimulation() {
    if (!fighterAId || !fighterBId || fighterAId === fighterBId) return;
    setLoading(true);
    setResult(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 95));
    }, 200);

    try {
      const res = await fetch("/api/simulate-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fighterAId, fighterBId, count: 10000 }),
      });
      const data = await res.json();
      setResult(data);
      setProgress(100);
    } catch {
      setResult(null);
    }

    clearInterval(interval);
    setLoading(false);
  }

  const maxRound = result ? Math.max(...Object.values(result.roundDistribution)) : 0;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">10K Simulation Lab</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">10K Fight Simulation Lab</h1>
        <p className="text-gray-500 text-sm mb-6">Run 10,000 simulations to find the true odds</p>

        {/* Fighter selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fighter A</label>
            <select
              value={fighterAId}
              onChange={(e) => setFighterAId(e.target.value)}
              className="w-full bg-[#161b22] border border-[#1c2333] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4ade80]/50"
            >
              <option value="">Select fighter...</option>
              {fighters.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.style})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fighter B</label>
            <select
              value={fighterBId}
              onChange={(e) => setFighterBId(e.target.value)}
              className="w-full bg-[#161b22] border border-[#1c2333] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4ade80]/50"
            >
              <option value="">Select fighter...</option>
              {fighters.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.style})</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading || !fighterAId || !fighterBId || fighterAId === fighterBId}
          className="w-full bg-[#4ade80] hover:bg-[#22c55e] disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-xl transition mb-8"
        >
          {loading ? "Simulating..." : "Run 10,000 Simulations"}
        </button>

        {/* Progress bar */}
        {loading && (
          <div className="mb-8">
            <div className="h-2 bg-[#161b22] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[#4ade80] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Running simulations... {Math.round(progress)}%
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Win distribution */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Win Distribution</h2>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm font-bold w-28 truncate">{result.fighterA.name}</span>
                <div className="flex-1 h-10 bg-[#0d1117] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#4ade80] flex items-center justify-center text-xs font-black text-black"
                    style={{ width: `${result.winPctA}%` }}
                  >
                    {result.winPctA}%
                  </div>
                  {result.drawPct > 0 && (
                    <div
                      className="h-full bg-gray-600 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${result.drawPct}%` }}
                    >
                      {result.drawPct}%
                    </div>
                  )}
                  <div
                    className="h-full bg-red-500 flex items-center justify-center text-xs font-black text-white"
                    style={{ width: `${result.winPctB}%` }}
                  >
                    {result.winPctB}%
                  </div>
                </div>
                <span className="text-sm font-bold w-28 truncate text-right">{result.fighterB.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-black text-[#4ade80]">{result.winsA.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-600">{result.fighterA.name} Wins</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-500">{result.draws.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-600">Draws</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-red-400">{result.winsB.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-600">{result.fighterB.name} Wins</p>
                </div>
              </div>
            </div>

            {/* Method breakdown */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Method Breakdown</h2>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: result.fighterA.name, data: result.methods.fighterA, color: "#4ade80" },
                  { label: result.fighterB.name, data: result.methods.fighterB, color: "#ef4444" },
                ].map((side) => {
                  const total = side.data.ko + side.data.sub + side.data.dec;
                  return (
                    <div key={side.label}>
                      <p className="text-xs font-bold mb-3" style={{ color: side.color }}>{side.label}</p>
                      {[
                        { label: "KO/TKO", value: side.data.ko },
                        { label: "SUB", value: side.data.sub },
                        { label: "DEC", value: side.data.dec },
                      ].map((m) => (
                        <div key={m.label} className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-gray-500 w-12">{m.label}</span>
                          <div className="flex-1 h-4 bg-[#0d1117] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: total > 0 ? `${(m.value / total) * 100}%` : "0%",
                                backgroundColor: side.color,
                                opacity: 0.7,
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold w-14 text-right">{m.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Round distribution */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Round Distribution</h2>
              <div className="flex items-end gap-2 h-32">
                {Object.entries(result.roundDistribution)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([round, count]) => (
                    <div key={round} className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] text-gray-500 mb-1">
                        {Math.round((count / result.count) * 100)}%
                      </span>
                      <div
                        className="w-full bg-[#4ade80]/60 rounded-t"
                        style={{ height: `${maxRound > 0 ? (count / maxRound) * 100 : 0}%` }}
                      />
                      <span className="text-[10px] text-gray-600 mt-1">R{round}</span>
                    </div>
                  ))}
              </div>
              <div className="text-center mt-4">
                <p className="text-sm text-gray-500">
                  Average fight length: <span className="text-white font-bold">{result.avgRounds} rounds</span>
                </p>
              </div>
            </div>

            {/* Implied odds */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Implied Fair Odds</h2>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-[#0d1117] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{result.fighterA.name}</p>
                  <p className="text-3xl font-black text-[#4ade80]">{result.impliedOdds.fairA.toFixed(2)}x</p>
                  <p className="text-[10px] text-gray-600 mt-1">Fair payout multiplier</p>
                </div>
                <div className="bg-[#0d1117] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{result.fighterB.name}</p>
                  <p className="text-3xl font-black text-red-400">{result.impliedOdds.fairB.toFixed(2)}x</p>
                  <p className="text-[10px] text-gray-600 mt-1">Fair payout multiplier</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 text-center mt-3">
                Based on {result.count.toLocaleString()} simulations (includes 5% margin)
              </p>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🧪</p>
            <p className="text-gray-500 text-sm">Select two fighters and run the simulation</p>
          </div>
        )}
      </main>
    </div>
  );
}
