"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  rarity: string;
  xp: number;
}

const categories = ["all", "betting", "streak", "prediction", "events", "resilience"];

const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
  common: { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20" },
  uncommon: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  rare: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  epic: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  legendary: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    fetch("/api/achievements?wallet=0xABC123")
      .then(r => r.json())
      .then(data => {
        setAchievements(data.achievements);
        setUnlocked(data.unlocked);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = category === "all"
    ? achievements
    : achievements.filter(a => a.category === category);

  const totalXp = achievements
    .filter(a => unlocked.includes(a.id))
    .reduce((sum, a) => sum + a.xp, 0);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">&rsaquo;</span>
          <span className="text-sm text-gray-400">Achievements</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">Achievements</h1>
        <p className="text-gray-500 text-sm mb-6">Unlock achievements by betting, winning, and grinding</p>

        {/* Stats */}
        <div className="flex gap-4 mb-6">
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] px-5 py-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Unlocked</p>
            <p className="text-xl font-black text-[#4ade80]">{unlocked.length}<span className="text-gray-600 text-sm font-normal">/{achievements.length}</span></p>
          </div>
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] px-5 py-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Total XP</p>
            <p className="text-xl font-black text-[#4ade80]">{totalXp}</p>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition capitalize ${
                category === cat
                  ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"
                  : "bg-[#161b22] text-gray-500 border border-[#1c2333] hover:text-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-600 text-center py-10">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(a => {
              const isUnlocked = unlocked.includes(a.id);
              const rc = rarityColors[a.rarity] || rarityColors.common;
              return (
                <div
                  key={a.id}
                  className={`bg-[#161b22] rounded-xl border border-[#1c2333] p-4 transition ${
                    isUnlocked ? "" : "opacity-40 grayscale"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{a.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${rc.bg} ${rc.text} ${rc.border} border capitalize`}>
                          {a.rarity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{a.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-600">+{a.xp} XP</span>
                        {isUnlocked ? (
                          <span className="text-[10px] text-[#4ade80]">Unlocked</span>
                        ) : (
                          <div className="flex-1 ml-3 max-w-[120px]">
                            <div className="h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                              <div className="h-full bg-gray-700 rounded-full" style={{ width: "0%" }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
