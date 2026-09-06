"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface BetHistory {
  id: string; fightId: string; matchup: string; side: string; pickedFighter: string;
  amount: number; odds: number; status: string; payout: number | null; profit: number;
  fightStatus: string; createdAt: string;
}

interface Profile {
  wallet: string; username: string; totalBets: number; wins: number; losses: number;
  totalWagered: number; totalWon: number; profit: number; memberSince: string;
}

export default function ProfilePage({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<BetHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/${wallet}`).then(r => r.json()).then(data => {
      setProfile(data.profile);
      setHistory(data.history);
      setLoading(false);
    });
  }, [wallet]);

  if (loading) return <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center text-gray-500">Loading...</div>;

  const winRate = profile && profile.totalBets > 0 ? Math.round((profile.wins / profile.totalBets) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Profile</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Profile header */}
        {profile && (
          <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] flex items-center justify-center text-2xl font-bold text-black">
                {profile.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile.username}</h1>
                <p className="text-sm font-mono text-gray-500">{profile.wallet.slice(0, 6)}...{profile.wallet.slice(-4)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: "Total Bets", value: profile.totalBets.toString(), color: "" },
                { label: "W / L", value: `${profile.wins} / ${profile.losses}`, color: "" },
                { label: "Win Rate", value: `${winRate}%`, color: winRate >= 50 ? "text-[#4ade80]" : "text-red-400" },
                { label: "Wagered", value: `$${profile.totalWagered.toFixed(0)}`, color: "" },
                { label: "Won", value: `$${profile.totalWon.toFixed(0)}`, color: "" },
                { label: "Profit", value: `${profile.profit >= 0 ? "+" : ""}$${profile.profit.toFixed(2)}`, color: profile.profit >= 0 ? "text-[#4ade80]" : "text-red-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#0d1117] rounded-xl p-3 border border-[#1c2333] text-center">
                  <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bet history */}
        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1c2333]">
            <h2 className="font-bold">Bet History</h2>
          </div>

          {history.length === 0 ? (
            <div className="p-10 text-center text-gray-600">No bets placed yet</div>
          ) : (
            <div className="divide-y divide-[#1c2333]">
              {history.map((bet) => (
                <div key={bet.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#1c2333]/20 transition">
                  <div className="flex-1 min-w-0">
                    <Link href={`/fight/${bet.fightId}`} className="text-sm font-medium hover:text-[#4ade80] transition">
                      {bet.matchup}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">Picked:</span>
                      <span className="text-xs font-semibold">{bet.pickedFighter}</span>
                      <span className="text-xs text-gray-600">@{bet.odds.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold">${bet.amount}</p>
                    <p className={`text-xs font-semibold ${
                      bet.status === "won" ? "text-[#4ade80]" : bet.status === "lost" ? "text-red-400" : "text-gray-500"
                    }`}>
                      {bet.status === "won" ? `+$${bet.profit.toFixed(2)}` :
                       bet.status === "lost" ? `-$${Math.abs(bet.profit).toFixed(2)}` :
                       "Pending"}
                    </p>
                  </div>
                  <span className={`ml-3 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    bet.status === "won" ? "bg-green-500/10 text-green-400" :
                    bet.status === "lost" ? "bg-red-500/10 text-red-400" :
                    "bg-gray-500/10 text-gray-400"
                  }`}>
                    {bet.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
