"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Fight {
  id: string;
  fighterA: { id: string; name: string };
  fighterB: { id: string; name: string };
  status: string;
}

interface Prediction {
  fighterA: { id: string; name: string; style: string; elo: number; record: string };
  fighterB: { id: string; name: string; style: string; elo: number; record: string };
  winProbA: number;
  winProbB: number;
  methodProbs: { ko: number; sub: number; dec: number };
  factors: { name: string; valueA: number; valueB: number; edge: string }[];
  analysis: string;
  confidence: string;
  recommendation: { side: string; fighter: string; confidence: string; reasoning: string };
  accuracy: { total: number; correct: number; percentage: number };
}

export default function PredictPage() {
  const [fights, setFights] = useState<Fight[]>([]);
  const [selectedFight, setSelectedFight] = useState("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/fights")
      .then((r) => r.json())
      .then((data) => setFights(data.filter((f: Fight) => f.status === "upcoming")))
      .catch(() => {});
  }, []);

  async function loadPrediction(fightId: string) {
    setSelectedFight(fightId);
    if (!fightId) { setPrediction(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/predict?fightId=${fightId}`);
      const data = await res.json();
      setPrediction(data);
    } catch { setPrediction(null); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">AI Predictor</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">AI Fight Predictor</h1>
        <p className="text-gray-500 text-sm mb-6">Advanced stat-based fight analysis and predictions</p>

        {/* Fight selector */}
        <div className="mb-8">
          <select
            value={selectedFight}
            onChange={(e) => loadPrediction(e.target.value)}
            className="w-full bg-[#161b22] border border-[#1c2333] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4ade80]/50"
          >
            <option value="">Select an upcoming fight...</option>
            {fights.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fighterA.name} vs {f.fighterB.name}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm mt-4">Analyzing matchup...</p>
          </div>
        )}

        {prediction && !loading && (
          <div className="space-y-6">
            {/* Win probability */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Win Probability</h2>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-sm font-bold w-32 truncate">{prediction.fighterA.name}</span>
                <div className="flex-1 h-8 bg-[#0d1117] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#4ade80] flex items-center justify-center text-xs font-black text-black transition-all duration-700"
                    style={{ width: `${prediction.winProbA}%` }}
                  >
                    {prediction.winProbA}%
                  </div>
                  <div
                    className="h-full bg-red-500 flex items-center justify-center text-xs font-black text-white transition-all duration-700"
                    style={{ width: `${prediction.winProbB}%` }}
                  >
                    {prediction.winProbB}%
                  </div>
                </div>
                <span className="text-sm font-bold w-32 truncate text-right">{prediction.fighterB.name}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>{prediction.fighterA.style} | ELO {prediction.fighterA.elo} | {prediction.fighterA.record}</span>
                <span>{prediction.fighterB.record} | ELO {prediction.fighterB.elo} | {prediction.fighterB.style}</span>
              </div>
            </div>

            {/* Key factors */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Key Factors</h2>
              <div className="space-y-3">
                {prediction.factors.map((f) => (
                  <div key={f.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20">{f.name}</span>
                    <span className={`text-sm font-bold w-8 text-right ${f.edge === "A" ? "text-[#4ade80]" : "text-gray-500"}`}>{f.valueA}</span>
                    <div className="flex-1 h-2 bg-[#0d1117] rounded-full overflow-hidden flex">
                      <div className="h-full bg-[#4ade80]/60" style={{ width: `${(f.valueA / (f.valueA + f.valueB)) * 100}%` }} />
                      <div className="h-full bg-red-500/60" style={{ width: `${(f.valueB / (f.valueA + f.valueB)) * 100}%` }} />
                    </div>
                    <span className={`text-sm font-bold w-8 ${f.edge === "B" ? "text-red-400" : "text-gray-500"}`}>{f.valueB}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Method probabilities */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Predicted Method</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "KO/TKO", value: prediction.methodProbs.ko, color: "text-red-400" },
                  { label: "Submission", value: prediction.methodProbs.sub, color: "text-blue-400" },
                  { label: "Decision", value: prediction.methodProbs.dec, color: "text-yellow-400" },
                ].map((m) => (
                  <div key={m.label} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#1c2333" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                          strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={`${m.value * 0.88} 88`}
                          className={m.color}
                        />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${m.color}`}>
                        {m.value}%
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Style Matchup Analysis</h2>
              <p className="text-sm text-gray-300 leading-relaxed">{prediction.analysis}</p>
            </div>

            {/* Recommendation */}
            <div className={`rounded-xl border p-6 ${
              prediction.confidence === "High"
                ? "bg-[#4ade80]/5 border-[#4ade80]/20"
                : prediction.confidence === "Medium"
                ? "bg-yellow-500/5 border-yellow-500/20"
                : "bg-gray-500/5 border-gray-500/20"
            }`}>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Recommended Bet</h2>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black ${
                  prediction.confidence === "High" ? "bg-[#4ade80]/10 text-[#4ade80]" :
                  prediction.confidence === "Medium" ? "bg-yellow-500/10 text-yellow-400" :
                  "bg-gray-500/10 text-gray-400"
                }`}>
                  {prediction.confidence === "High" ? "A+" : prediction.confidence === "Medium" ? "B" : "C"}
                </div>
                <div>
                  <p className="font-bold">{prediction.recommendation.fighter}</p>
                  <p className="text-xs text-gray-500">{prediction.recommendation.reasoning}</p>
                </div>
                <div className="ml-auto text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    prediction.confidence === "High" ? "bg-[#4ade80]/10 text-[#4ade80]" :
                    prediction.confidence === "Medium" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-gray-500/10 text-gray-400"
                  }`}>
                    {prediction.confidence} Confidence
                  </span>
                </div>
              </div>
            </div>

            {/* Historical accuracy */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">AI Historical Accuracy</h2>
              {prediction.accuracy.total > 0 ? (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-black text-[#4ade80]">{prediction.accuracy.percentage}%</p>
                    <p className="text-[10px] text-gray-600">Accuracy</p>
                  </div>
                  <div className="flex-1 h-3 bg-[#0d1117] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4ade80] rounded-full" style={{ width: `${prediction.accuracy.percentage}%` }} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{prediction.accuracy.correct}/{prediction.accuracy.total}</p>
                    <p className="text-[10px] text-gray-600">Correct Picks</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No finished fights to evaluate yet.</p>
              )}
            </div>
          </div>
        )}

        {!prediction && !loading && !selectedFight && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🤖</p>
            <p className="text-gray-500 text-sm">Select an upcoming fight to see AI predictions</p>
          </div>
        )}
      </main>
    </div>
  );
}
