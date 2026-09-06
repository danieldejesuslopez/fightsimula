"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Season {
  id: string;
  name: string;
  number: number;
  status: string;
  start_date: string;
  end_date: string;
  prize_pool: number;
}

interface Standing {
  season_id: string;
  wallet: string;
  points: number;
  bets_won: number;
  bets_total: number;
  profit: number;
  rank: number;
}

const rewardTiers = [
  { place: "1st", pct: "40%", color: "text-yellow-400" },
  { place: "2nd", pct: "25%", color: "text-gray-300" },
  { place: "3rd", pct: "15%", color: "text-orange-400" },
  { place: "4th-10th", pct: "20%", color: "text-gray-500" },
];

export default function SeasonsPage() {
  const [season, setSeason] = useState<Season | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastOpen, setPastOpen] = useState(false);

  useEffect(() => {
    fetch("/api/seasons")
      .then(r => r.json())
      .then(data => {
        setSeason(data.season);
        setStandings(data.standings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const daysRemaining = season
    ? Math.max(0, Math.ceil((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">&rsaquo;</span>
          <span className="text-sm text-gray-400">Seasons</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-gray-600 text-center py-10">Loading...</p>
        ) : !season ? (
          <p className="text-gray-600 text-center py-10">No active season</p>
        ) : (
          <>
            {/* Season Hero */}
            <div className="bg-gradient-to-br from-[#4ade80]/10 via-[#161b22] to-[#161b22] rounded-2xl border border-[#4ade80]/20 p-6 mb-8">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-[#4ade80] font-bold">Season {season.number}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">Active</span>
              </div>
              <h1 className="text-3xl font-black mb-3">{season.name}</h1>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">Prize Pool</p>
                  <p className="text-xl font-black text-[#4ade80]">${season.prize_pool.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">Days Left</p>
                  <p className="text-xl font-black">{daysRemaining}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">Dates</p>
                  <p className="text-sm text-gray-400">{season.start_date} &mdash; {season.end_date}</p>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <h2 className="text-xl font-black mb-4">Leaderboard</h2>
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] overflow-hidden mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-gray-600 border-b border-[#1c2333]">
                    <th className="text-left px-4 py-3">Rank</th>
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-right px-4 py-3">Points</th>
                    <th className="text-right px-4 py-3 hidden sm:table-cell">W/L</th>
                    <th className="text-right px-4 py-3 hidden sm:table-cell">Win Rate</th>
                    <th className="text-right px-4 py-3">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => {
                    const winRate = s.bets_total > 0 ? ((s.bets_won / s.bets_total) * 100).toFixed(0) : "0";
                    return (
                      <tr key={s.wallet} className="border-b border-[#1c2333] last:border-0 hover:bg-[#0d1117]/50 transition">
                        <td className="px-4 py-3 font-black">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${s.rank}`}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{s.wallet}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#4ade80]">{s.points}</td>
                        <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{s.bets_won}/{s.bets_total}</td>
                        <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{winRate}%</td>
                        <td className={`px-4 py-3 text-right font-bold ${s.profit >= 0 ? "text-[#4ade80]" : "text-red-400"}`}>
                          {s.profit >= 0 ? "+" : ""}{s.profit.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rewards */}
            <h2 className="text-xl font-black mb-4">Season Rewards</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {rewardTiers.map(t => (
                <div key={t.place} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 text-center">
                  <p className={`text-lg font-black ${t.color}`}>{t.place}</p>
                  <p className="text-2xl font-black mt-1">{t.pct}</p>
                  <p className="text-[10px] text-gray-600 mt-1">of prize pool</p>
                </div>
              ))}
            </div>

            {/* Past Seasons */}
            <button
              onClick={() => setPastOpen(!pastOpen)}
              className="w-full bg-[#161b22] rounded-xl border border-[#1c2333] p-4 flex items-center justify-between hover:border-[#2d3748] transition"
            >
              <span className="font-bold text-sm">Past Seasons</span>
              <span className="text-gray-600 text-sm">{pastOpen ? "−" : "+"}</span>
            </button>
            {pastOpen && (
              <div className="bg-[#161b22] rounded-b-xl border border-t-0 border-[#1c2333] p-6 text-center">
                <p className="text-gray-600 text-sm">No past seasons yet</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
