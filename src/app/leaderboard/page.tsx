"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardEntry {
  wallet: string;
  total_bets: number;
  wins: number;
  losses: number;
  total_wagered: number;
  total_won: number;
  profit: number;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Leaderboard</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🏆 Leaderboard</h1>
          <span className="text-xs text-gray-500">{data.length} traders</span>
        </div>

        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-600">Loading...</div>
          ) : data.length === 0 ? (
            <div className="p-10 text-center text-gray-600">No settled bets yet. Place some bets and simulate fights!</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-[#1c2333]">
                  <th className="text-left px-5 py-3">#</th>
                  <th className="text-left px-5 py-3">Wallet</th>
                  <th className="text-right px-5 py-3">W/L</th>
                  <th className="text-right px-5 py-3">Win Rate</th>
                  <th className="text-right px-5 py-3">Wagered</th>
                  <th className="text-right px-5 py-3">Won</th>
                  <th className="text-right px-5 py-3">Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry, i) => {
                  const winRate = entry.total_bets > 0 ? Math.round((entry.wins / entry.total_bets) * 100) : 0;
                  return (
                    <tr key={entry.wallet} className="border-b border-[#1c2333] hover:bg-[#1c2333]/30 transition">
                      <td className="px-5 py-3 text-sm">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-mono">{entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm">
                        <span className="text-green-400">{entry.wins}</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-red-400">{entry.losses}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm">
                        <span className={winRate >= 50 ? "text-green-400" : "text-red-400"}>{winRate}%</span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-400">${entry.total_wagered.toFixed(0)}</td>
                      <td className="px-5 py-3 text-right text-sm text-gray-400">${entry.total_won.toFixed(0)}</td>
                      <td className={`px-5 py-3 text-right text-sm font-semibold ${entry.profit >= 0 ? "text-[#4ade80]" : "text-red-400"}`}>
                        {entry.profit >= 0 ? "+" : ""}${entry.profit.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
