"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Whale {
  rank: number;
  wallet: string;
  username: string | null;
  total_wagered: number;
  total_bets: number;
  wins: number;
  losses: number;
  win_rate: number;
  biggest_bet: number;
  roi: number;
  last_active: string;
}

interface WhaleMove {
  id: string;
  wallet: string;
  amount: number;
  side: string;
  fighter_a: string;
  fighter_b: string;
  created_at: string;
}

interface WhaleData {
  whales: Whale[];
  recentMoves: WhaleMove[];
  alerts: WhaleMove[];
  stats: { total_volume: number; active_whales: number; avg_bet: number };
}

function shortWallet(w: string): string {
  return w.length > 10 ? w.slice(0, 6) + "..." + w.slice(-4) : w;
}

function formatMoney(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WhalesPage() {
  const [data, setData] = useState<WhaleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/whales")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Whale Tracker</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">Whale Tracker</h1>
        <p className="text-gray-500 text-sm mb-6">Track the biggest bettors on AllFights</p>

        {loading ? (
          <p className="text-gray-600 text-center py-10">Loading...</p>
        ) : !data ? (
          <p className="text-gray-600 text-center py-10">Failed to load whale data</p>
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Total Whale Volume", value: formatMoney(data.stats.total_volume), icon: "💎" },
                { label: "Active Whales", value: data.stats.active_whales.toString(), icon: "🐋" },
                { label: "Avg Whale Bet", value: formatMoney(data.stats.avg_bet), icon: "📊" },
              ].map((s) => (
                <div key={s.label} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 text-center">
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="text-xl font-black text-[#4ade80]">{s.value}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Whale table */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] overflow-hidden mb-8">
              <div className="p-4 border-b border-[#1c2333]">
                <h2 className="text-sm font-bold flex items-center gap-2">🐋 Top Whales</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-gray-600 uppercase">
                      <th className="text-left px-4 py-3">Rank</th>
                      <th className="text-left px-4 py-3">Wallet</th>
                      <th className="text-right px-4 py-3">Total Wagered</th>
                      <th className="text-right px-4 py-3">Win Rate</th>
                      <th className="text-right px-4 py-3">Biggest Bet</th>
                      <th className="text-right px-4 py-3">ROI</th>
                      <th className="text-right px-4 py-3">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.whales.map((w) => (
                      <tr key={w.wallet} className="border-t border-[#1c2333] hover:bg-[#0d1117]/50 transition">
                        <td className="px-4 py-3">
                          <span className={`font-black ${
                            w.rank === 1 ? "text-yellow-400" :
                            w.rank === 2 ? "text-gray-300" :
                            w.rank === 3 ? "text-orange-400" :
                            "text-gray-600"
                          }`}>
                            {w.rank <= 3 ? ["🥇", "🥈", "🥉"][w.rank - 1] : `#${w.rank}`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-bold text-white">{w.username || shortWallet(w.wallet)}</span>
                            {w.username && (
                              <span className="text-[10px] text-gray-600 ml-2">{shortWallet(w.wallet)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#4ade80]">{formatMoney(w.total_wagered)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={w.win_rate >= 50 ? "text-green-400" : "text-red-400"}>
                            {w.win_rate}%
                          </span>
                          <span className="text-[10px] text-gray-600 ml-1">({w.wins}W-{w.losses}L)</span>
                        </td>
                        <td className="px-4 py-3 text-right text-white">{formatMoney(w.biggest_bet)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={w.roi >= 0 ? "text-green-400" : "text-red-400"}>
                            {w.roi > 0 ? "+" : ""}{w.roi}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 text-xs">{w.last_active ? timeAgo(w.last_active) : "-"}</td>
                      </tr>
                    ))}
                    {data.whales.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-600">No whale data yet. Place some bets!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent whale moves */}
              <div className="bg-[#161b22] rounded-xl border border-[#1c2333]">
                <div className="p-4 border-b border-[#1c2333]">
                  <h2 className="text-sm font-bold flex items-center gap-2">📡 Recent Whale Moves</h2>
                </div>
                <div className="divide-y divide-[#1c2333]">
                  {data.recentMoves.length === 0 ? (
                    <p className="text-gray-600 text-center py-6 text-xs">No large bets yet</p>
                  ) : (
                    data.recentMoves.map((m) => (
                      <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs">🐋</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">
                            <span className="font-bold text-[#4ade80]">{shortWallet(m.wallet)}</span>
                            {" bet "}
                            <span className="font-bold text-white">{formatMoney(m.amount)}</span>
                            {" on "}
                            <span className="text-gray-300">{m.side === "A" ? m.fighter_a : m.fighter_b}</span>
                          </p>
                          <p className="text-[10px] text-gray-600">{m.fighter_a} vs {m.fighter_b}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(m.created_at)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Whale alerts */}
              <div className="bg-[#161b22] rounded-xl border border-[#1c2333]">
                <div className="p-4 border-b border-[#1c2333]">
                  <h2 className="text-sm font-bold flex items-center gap-2">🚨 Whale Alerts (24h)</h2>
                </div>
                <div className="divide-y divide-[#1c2333]">
                  {data.alerts.length === 0 ? (
                    <p className="text-gray-600 text-center py-6 text-xs">No whale alerts in the last 24h</p>
                  ) : (
                    data.alerts.map((a) => (
                      <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xs">🚨</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">
                            <span className="font-bold text-white">{formatMoney(a.amount)}</span>
                            {" on "}
                            <span className="text-gray-300">{a.side === "A" ? a.fighter_a : a.fighter_b}</span>
                          </p>
                          <p className="text-[10px] text-gray-600">{shortWallet(a.wallet)}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(a.created_at)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
