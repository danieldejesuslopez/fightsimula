"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Trader {
  wallet: string;
  total_bets: number;
  wins: number;
  total_wagered: number;
  total_profit: number;
  roi: number;
  win_rate: number;
  followers: number;
}

interface ActiveCopy {
  id: string;
  leader_wallet: string;
  max_bet: number;
  multiplier: number;
  total_copied: number;
  profit: number;
  leader_roi: number | null;
  leader_win_rate: number | null;
}

const DEMO_WALLET = "0xABC123";

function truncate(wallet: string) {
  if (wallet.length <= 10) return wallet;
  return wallet.slice(0, 6) + "..." + wallet.slice(-4);
}

export default function CopyTradingPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [copies, setCopies] = useState<ActiveCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const fetchData = () => {
    fetch(`/api/copy-trading?wallet=${DEMO_WALLET}`)
      .then((r) => r.json())
      .then((data) => {
        setTraders(data.topTraders || []);
        setCopies(data.activeCopies || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleCopy = async (leaderWallet: string) => {
    setCopyingId(leaderWallet);
    await fetch("/api/copy-trading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ follower_wallet: DEMO_WALLET, leader_wallet: leaderWallet, max_bet: 100, multiplier: 1.0 }),
    });
    fetchData();
    setCopyingId(null);
  };

  const handleStop = async (id: string) => {
    await fetch("/api/copy-trading", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  const isAlreadyCopying = (wallet: string) => copies.some((c) => c.leader_wallet === wallet);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Copy Trading</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">Copy Trading</h1>
        <p className="text-gray-500 text-sm mb-8">Follow top bettors and automatically mirror their bets</p>

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { step: "1", title: "Find a Trader", desc: "Browse the leaderboard and find traders with winning records" },
            { step: "2", title: "Copy Their Bets", desc: "Set your max bet and multiplier, then start copying" },
            { step: "3", title: "Earn Together", desc: "When they win, you win. Stop anytime you want" },
          ].map((s) => (
            <div key={s.step} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-5">
              <div className="w-8 h-8 rounded-full bg-[#4ade80]/10 text-[#4ade80] flex items-center justify-center text-sm font-black mb-3">{s.step}</div>
              <h3 className="font-bold text-sm mb-1">{s.title}</h3>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Active Copies */}
        {copies.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-black mb-4">Your Active Copies</h2>
            <div className="space-y-3">
              {copies.map((c) => (
                <div key={c.id} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">Copying {truncate(c.leader_wallet)}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>Max Bet: ${c.max_bet}</span>
                      <span>Multiplier: {c.multiplier}x</span>
                      <span>Copied: ${c.total_copied.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <p className={`text-sm font-bold ${c.profit >= 0 ? "text-[#4ade80]" : "text-red-400"}`}>
                      {c.profit >= 0 ? "+" : ""}${c.profit.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-gray-600">Copy P&L</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>ROI: {c.leader_roi ?? "N/A"}%</p>
                    <p>WR: {c.leader_win_rate ?? "N/A"}%</p>
                  </div>
                  <button
                    onClick={() => handleStop(c.id)}
                    className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition"
                  >
                    Stop
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Traders Leaderboard */}
        <h2 className="text-xl font-black mb-4">Top Traders</h2>
        {loading ? (
          <p className="text-gray-600 text-center py-10">Loading...</p>
        ) : traders.length === 0 ? (
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-10 text-center">
            <p className="text-gray-500 text-sm">No trader data yet. Place some bets to see the leaderboard!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {traders.map((t, i) => (
              <div key={t.wallet} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 flex items-center gap-4 hover:border-[#2d3748] transition">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                  i === 0 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                  i === 1 ? "bg-gray-300/10 text-gray-300 border border-gray-400/20" :
                  i === 2 ? "bg-orange-600/10 text-orange-400 border border-orange-500/20" :
                  "bg-[#0d1117] text-gray-600 border border-[#1c2333]"
                }`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{truncate(t.wallet)}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-0.5">
                    <span>{t.total_bets} bets</span>
                    <span>{t.wins}W</span>
                    <span>{t.followers} followers</span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-4">
                  <div className="text-center w-14">
                    <p className="text-[10px] text-gray-600">ROI</p>
                    <p className={`text-xs font-bold ${(t.roi ?? 0) >= 0 ? "text-[#4ade80]" : "text-red-400"}`}>{t.roi ?? 0}%</p>
                  </div>
                  <div className="text-center w-14">
                    <p className="text-[10px] text-gray-600">Win Rate</p>
                    <p className="text-xs font-bold text-white">{t.win_rate ?? 0}%</p>
                  </div>
                  <div className="text-center w-16">
                    <p className="text-[10px] text-gray-600">Profit</p>
                    <p className={`text-xs font-bold ${(t.total_profit ?? 0) >= 0 ? "text-[#4ade80]" : "text-red-400"}`}>
                      ${(t.total_profit ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(t.wallet)}
                  disabled={isAlreadyCopying(t.wallet) || copyingId === t.wallet || t.wallet === DEMO_WALLET}
                  className={`px-4 py-1.5 text-xs rounded-lg font-bold transition shrink-0 ${
                    isAlreadyCopying(t.wallet)
                      ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                      : t.wallet === DEMO_WALLET
                      ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                      : "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 hover:bg-[#4ade80]/20"
                  }`}
                >
                  {isAlreadyCopying(t.wallet) ? "Copying" : copyingId === t.wallet ? "..." : "Copy"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
