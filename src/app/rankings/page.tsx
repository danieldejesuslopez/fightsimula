"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Fighter {
  id: string;
  name: string;
  nickname: string;
  style: string;
  rating: number;
  striking: number;
  grappling: number;
  cardio: number;
  chin: number;
  speed: number;
  elo: number;
  wins: number;
  losses: number;
  ko_wins: number;
  sub_wins: number;
  dec_wins: number;
  streak: number;
  weight: number;
  height: number;
  reach: number;
}

type SortKey = "elo" | "striking" | "grappling" | "speed" | "ko_wins";

const sortOptions: { key: SortKey; label: string; icon: string }[] = [
  { key: "elo", label: "Overall", icon: "🏆" },
  { key: "striking", label: "Strikers", icon: "👊" },
  { key: "grappling", label: "Grapplers", icon: "🤼" },
  { key: "speed", label: "Speed", icon: "⚡" },
  { key: "ko_wins", label: "KO Power", icon: "💥" },
];

export default function RankingsPage() {
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("elo");

  useEffect(() => {
    fetch("/api/fighters")
      .then(r => r.json())
      .then(data => { setFighters(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...fighters].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Rankings</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">Global Rankings</h1>
        <p className="text-gray-500 text-sm mb-6">Fighter rankings based on ELO rating system</p>

        {/* Sort tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {sortOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition ${
                sortBy === opt.key
                  ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"
                  : "bg-[#161b22] text-gray-500 border border-[#1c2333] hover:text-gray-300"
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-600 text-center py-10">Loading...</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((f, i) => (
              <div key={f.id} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 flex items-center gap-4 hover:border-[#2d3748] transition">
                {/* Rank */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                  i === 0 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                  i === 1 ? "bg-gray-300/10 text-gray-300 border border-gray-400/20" :
                  i === 2 ? "bg-orange-600/10 text-orange-400 border border-orange-500/20" :
                  "bg-[#0d1117] text-gray-600 border border-[#1c2333]"
                }`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </div>

                {/* Fighter info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/fighter/${f.id}`} className="font-bold text-sm hover:text-[#4ade80] transition">{f.name}</Link>
                    {f.streak > 0 && <span className="text-[10px] text-orange-400">🔥 W{f.streak}</span>}
                    {f.streak < 0 && <span className="text-[10px] text-red-400">L{Math.abs(f.streak)}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-0.5">
                    <span>{f.style}</span>
                    <span>{f.wins}W - {f.losses}L</span>
                    <span>{f.ko_wins} KO • {f.sub_wins} SUB • {f.dec_wins} DEC</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-3">
                  {[
                    { label: "STR", value: f.striking },
                    { label: "GRP", value: f.grappling },
                    { label: "SPD", value: f.speed },
                    { label: "CHN", value: f.chin },
                    { label: "CRD", value: f.cardio },
                  ].map(s => (
                    <div key={s.label} className="text-center w-10">
                      <p className="text-[10px] text-gray-600">{s.label}</p>
                      <p className={`text-xs font-bold ${s.value >= 85 ? "text-[#4ade80]" : s.value >= 70 ? "text-white" : "text-gray-500"}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* ELO */}
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-[#4ade80]">{f.elo}</p>
                  <p className="text-[10px] text-gray-600">ELO</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
