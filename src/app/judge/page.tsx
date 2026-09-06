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

interface CriteriaScore {
  striking: number;
  grappling: number;
  aggression: number;
  octagonControl: number;
}

interface JudgeRoundScore {
  round: number;
  fighterA: number;
  fighterB: number;
  criteria: { fighterA: CriteriaScore; fighterB: CriteriaScore };
}

interface JudgeCard {
  name: string;
  scores: JudgeRoundScore[];
  totalA: number;
  totalB: number;
}

interface JudgeData {
  fighterA: string;
  fighterB: string;
  judges: JudgeCard[];
  decision: string;
  analysis: string;
  method: string;
}

function CriteriaBar({ label, valA, valB }: { label: string; valA: number; valB: number }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-6 text-right text-red-400 font-semibold">{valA}</span>
      <div className="flex-1 flex gap-0.5 h-1.5">
        <div className="flex-1 bg-[#1c2333] rounded-l-full overflow-hidden flex justify-end">
          <div className="bg-red-500/60 rounded-l-full" style={{ width: `${valA * 20}%` }} />
        </div>
        <div className="flex-1 bg-[#1c2333] rounded-r-full overflow-hidden">
          <div className="bg-blue-500/60 rounded-r-full" style={{ width: `${valB * 20}%` }} />
        </div>
      </div>
      <span className="w-6 text-blue-400 font-semibold">{valB}</span>
      <span className="w-24 text-gray-600 text-right">{label}</span>
    </div>
  );
}

export default function JudgePage() {
  const [fights, setFights] = useState<Fight[]>([]);
  const [selectedFight, setSelectedFight] = useState<string>("");
  const [judgeData, setJudgeData] = useState<JudgeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/fights")
      .then(r => r.json())
      .then((data: Fight[]) => setFights(data.filter(f => f.status === "finished")));
  }, []);

  useEffect(() => {
    if (!selectedFight) { setJudgeData(null); return; }
    setLoading(true);
    fetch(`/api/judge?fightId=${selectedFight}`)
      .then(r => r.json())
      .then(d => { setJudgeData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedFight]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">AI Judge</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black mb-2">AI Judge Scorecards</h1>
          <p className="text-sm text-gray-500">Official scoring breakdown by three AI judges using MMA Unified Rules criteria.</p>
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

        {loading && (
          <div className="text-center py-16 text-gray-500">Loading scorecards...</div>
        )}

        {judgeData && !loading && (
          <div className="space-y-6">
            {/* Decision banner */}
            <div className="bg-gradient-to-r from-[#0e4429]/30 to-[#1a1a3e]/30 rounded-2xl border border-[#1c2333] p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Official Decision</p>
              <p className="text-xl font-black text-[#4ade80] mb-3">{judgeData.decision}</p>
              <div className="flex justify-center gap-6 text-sm">
                {judgeData.judges.map((j) => (
                  <div key={j.name} className="text-center">
                    <p className="text-gray-500 text-xs">{j.name}</p>
                    <p className="font-bold">
                      <span className={j.totalA > j.totalB ? "text-red-400" : "text-gray-400"}>{j.totalA}</span>
                      <span className="text-gray-600 mx-1">-</span>
                      <span className={j.totalB > j.totalA ? "text-blue-400" : "text-gray-400"}>{j.totalB}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Judge cards */}
            {judgeData.judges.map((judge) => (
              <div key={judge.name} className="bg-[#161b22] rounded-2xl border border-[#1c2333] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1c2333] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm">{judge.name}</h3>
                    <p className="text-[10px] text-gray-600">Licensed MMA Judge</p>
                  </div>
                  <div className="text-right">
                    <span className="text-red-400 font-bold">{judge.totalA}</span>
                    <span className="text-gray-600 mx-2">-</span>
                    <span className="text-blue-400 font-bold">{judge.totalB}</span>
                  </div>
                </div>

                {/* Header */}
                <div className="grid grid-cols-4 text-[10px] text-gray-600 px-5 py-2 border-b border-[#1c2333]/50 uppercase tracking-wider">
                  <span>Round</span>
                  <span className="text-center text-red-400">{judgeData.fighterA}</span>
                  <span className="text-center text-blue-400">{judgeData.fighterB}</span>
                  <span className="text-right">Details</span>
                </div>

                {judge.scores.map((rs) => (
                  <div key={rs.round}>
                    <div
                      className="grid grid-cols-4 items-center px-5 py-3 border-b border-[#1c2333]/30 hover:bg-[#0d1117]/50 cursor-pointer transition"
                      onClick={() => setExpandedRound(expandedRound === rs.round ? null : rs.round)}
                    >
                      <span className="text-sm font-semibold">R{rs.round}</span>
                      <span className={`text-center text-lg font-black ${rs.fighterA > rs.fighterB ? "text-red-400" : "text-gray-500"}`}>
                        {rs.fighterA}
                      </span>
                      <span className={`text-center text-lg font-black ${rs.fighterB > rs.fighterA ? "text-blue-400" : "text-gray-500"}`}>
                        {rs.fighterB}
                      </span>
                      <span className="text-right text-xs text-gray-600">
                        {expandedRound === rs.round ? "▲" : "▼"}
                      </span>
                    </div>
                    {expandedRound === rs.round && (
                      <div className="px-5 py-3 bg-[#0d1117]/50 space-y-1.5">
                        <CriteriaBar label="Eff. Striking" valA={rs.criteria.fighterA.striking} valB={rs.criteria.fighterB.striking} />
                        <CriteriaBar label="Grappling" valA={rs.criteria.fighterA.grappling} valB={rs.criteria.fighterB.grappling} />
                        <CriteriaBar label="Aggression" valA={rs.criteria.fighterA.aggression} valB={rs.criteria.fighterB.aggression} />
                        <CriteriaBar label="Oct. Control" valA={rs.criteria.fighterA.octagonControl} valB={rs.criteria.fighterB.octagonControl} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Analysis */}
            <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Fight Analysis</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{judgeData.analysis}</p>
            </div>
          </div>
        )}

        {!selectedFight && !loading && (
          <div className="text-center py-16">
            <p className="text-gray-600 text-sm">Select a completed fight above to view the AI Judge scorecards.</p>
          </div>
        )}
      </main>
    </div>
  );
}
