"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BetRecord {
  id: string;
  fight_id: string;
  amount: number;
  side: string;
  odds: number;
  status: string;
  payout: number | null;
  created_at: string;
  fight_status: string;
  winner_id: string | null;
  method: string | null;
  scheduled_at: string;
  fighter_a_name: string;
  fighter_a_id: string;
  fighter_b_name: string;
  fighter_b_id: string;
}

interface MarketBetRecord {
  id: string;
  market_id: string;
  amount: number;
  selection: string;
  odds: number;
  status: string;
  payout: number | null;
  created_at: string;
  question: string;
  type: string;
  result: string | null;
}

interface Summary {
  totalWagered: number;
  totalWon: number;
  netPnL: number;
  winRate: number;
  roi: number;
  totalBets: number;
  activeBets: number;
  bestWin: number;
  worstLoss: number;
  streak: number;
}

type FilterTab = "all" | "won" | "lost" | "pending";

const WALLET = "0xABC123";

export default function PortfolioPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [marketBets, setMarketBets] = useState<MarketBetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    fetch(`/api/portfolio?wallet=${WALLET}`)
      .then((r) => r.json())
      .then((data) => {
        setSummary(data.summary);
        setBets(data.bets || []);
        setMarketBets(data.marketBets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? bets : bets.filter((b) => b.status === filter);

  // Cumulative P&L data for chart
  const chartData = [...bets]
    .filter((b) => b.status !== "pending")
    .reverse()
    .reduce<{ label: string; value: number }[]>((acc, b) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].value : 0;
      const pnl = b.status === "won" ? (b.payout || 0) - b.amount : -b.amount;
      acc.push({ label: b.created_at, value: prev + pnl });
      return acc;
    }, []);

  const chartMin = chartData.length > 0 ? Math.min(...chartData.map((d) => d.value)) : 0;
  const chartMax = chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) : 0;
  const chartRange = chartMax - chartMin || 1;

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "won", label: "Won" },
    { key: "lost", label: "Lost" },
    { key: "pending", label: "Pending" },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Portfolio</span>
          <div className="flex-1" />
          <Link href="/rankings" className="text-xs text-gray-500 hover:text-gray-300 transition">Rankings</Link>
          <Link href="/verify" className="text-xs text-gray-500 hover:text-gray-300 transition">Verify</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-1">Portfolio</h1>
        <p className="text-gray-500 text-sm mb-6">P&L Dashboard &middot; <span className="text-gray-600 font-mono text-xs">{WALLET}</span></p>

        {loading ? (
          <p className="text-gray-600 text-center py-20">Loading...</p>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              {[
                {
                  label: "Total P&L",
                  value: `${(summary?.netPnL ?? 0) >= 0 ? "+" : ""}${(summary?.netPnL ?? 0).toFixed(2)}`,
                  color: (summary?.netPnL ?? 0) >= 0 ? "text-[#4ade80]" : "text-red-400",
                  sub: "SOL",
                },
                {
                  label: "ROI",
                  value: `${(summary?.roi ?? 0) >= 0 ? "+" : ""}${(summary?.roi ?? 0).toFixed(1)}%`,
                  color: (summary?.roi ?? 0) >= 0 ? "text-[#4ade80]" : "text-red-400",
                },
                {
                  label: "Win Rate",
                  value: `${(summary?.winRate ?? 0).toFixed(1)}%`,
                  color: "text-white",
                },
                {
                  label: "Wagered",
                  value: (summary?.totalWagered ?? 0).toFixed(2),
                  color: "text-white",
                  sub: "SOL",
                },
                {
                  label: "Won",
                  value: (summary?.totalWon ?? 0).toFixed(2),
                  color: "text-[#4ade80]",
                  sub: "SOL",
                },
                {
                  label: "Active",
                  value: `${summary?.activeBets ?? 0}`,
                  color: "text-yellow-400",
                  sub: "bets",
                },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className={`text-xl font-black ${stat.color}`}>
                    {stat.value}
                    {stat.sub && <span className="text-xs text-gray-600 ml-1 font-normal">{stat.sub}</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Extra stats row */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#4ade80]/10 flex items-center justify-center text-sm">🏆</div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Best Win</p>
                  <p className="text-sm font-bold text-[#4ade80]">+{(summary?.bestWin ?? 0).toFixed(2)} SOL</p>
                </div>
              </div>
              <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-sm">💀</div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Worst Loss</p>
                  <p className="text-sm font-bold text-red-400">{(summary?.worstLoss ?? 0).toFixed(2)} SOL</p>
                </div>
              </div>
              <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${(summary?.streak ?? 0) >= 0 ? "bg-[#4ade80]/10" : "bg-red-500/10"}`}>
                  {(summary?.streak ?? 0) >= 0 ? "🔥" : "❄️"}
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Streak</p>
                  <p className={`text-sm font-bold ${(summary?.streak ?? 0) >= 0 ? "text-[#4ade80]" : "text-red-400"}`}>
                    {(summary?.streak ?? 0) > 0 ? `W${summary?.streak}` : (summary?.streak ?? 0) < 0 ? `L${Math.abs(summary?.streak ?? 0)}` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* P&L Chart */}
            {chartData.length > 1 && (
              <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 mb-8">
                <h2 className="text-sm font-bold mb-4">Cumulative P&L</h2>
                <svg viewBox={`0 0 ${Math.max(chartData.length * 40, 300)} 160`} className="w-full h-40">
                  {/* Zero line */}
                  <line
                    x1="0"
                    y1={140 - ((0 - chartMin) / chartRange) * 120}
                    x2={chartData.length * 40}
                    y2={140 - ((0 - chartMin) / chartRange) * 120}
                    stroke="#1c2333"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke={chartData[chartData.length - 1]?.value >= 0 ? "#4ade80" : "#f87171"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartData
                      .map((d, i) => {
                        const x = 20 + i * ((Math.max(chartData.length * 40, 300) - 40) / (chartData.length - 1));
                        const y = 140 - ((d.value - chartMin) / chartRange) * 120;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                  {/* Area fill */}
                  <polygon
                    fill={chartData[chartData.length - 1]?.value >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)"}
                    points={`20,${140 - ((0 - chartMin) / chartRange) * 120} ${chartData
                      .map((d, i) => {
                        const x = 20 + i * ((Math.max(chartData.length * 40, 300) - 40) / (chartData.length - 1));
                        const y = 140 - ((d.value - chartMin) / chartRange) * 120;
                        return `${x},${y}`;
                      })
                      .join(" ")} ${20 + (chartData.length - 1) * ((Math.max(chartData.length * 40, 300) - 40) / (chartData.length - 1))},${140 - ((0 - chartMin) / chartRange) * 120}`}
                  />
                  {/* Dots */}
                  {chartData.map((d, i) => {
                    const x = 20 + i * ((Math.max(chartData.length * 40, 300) - 40) / (chartData.length - 1));
                    const y = 140 - ((d.value - chartMin) / chartRange) * 120;
                    return (
                      <circle key={i} cx={x} cy={y} r="3" fill={d.value >= 0 ? "#4ade80" : "#f87171"} />
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition ${
                    filter === tab.key
                      ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"
                      : "bg-[#161b22] text-gray-500 border border-[#1c2333] hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                  {tab.key !== "all" && (
                    <span className="ml-1 text-gray-600">
                      {bets.filter((b) => b.status === tab.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Bet History Table */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1c2333] text-[10px] text-gray-500 uppercase">
                      <th className="text-left px-4 py-3">Fight</th>
                      <th className="text-left px-4 py-3">Side</th>
                      <th className="text-right px-4 py-3">Amount</th>
                      <th className="text-right px-4 py-3">Odds</th>
                      <th className="text-center px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Payout</th>
                      <th className="text-right px-4 py-3">P&L</th>
                      <th className="text-right px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-gray-600">No bets found</td>
                      </tr>
                    ) : (
                      filtered.map((b) => {
                        const fighterName = b.side === "A" ? b.fighter_a_name : b.fighter_b_name;
                        const pnl = b.status === "won" ? (b.payout || 0) - b.amount : b.status === "lost" ? -b.amount : 0;
                        return (
                          <tr key={b.id} className="border-b border-[#1c2333]/50 hover:bg-[#0d1117]/50 transition">
                            <td className="px-4 py-3">
                              <Link href={`/fight/${b.fight_id}`} className="hover:text-[#4ade80] transition">
                                <span className="font-medium">{b.fighter_a_name}</span>
                                <span className="text-gray-600 mx-1">vs</span>
                                <span className="font-medium">{b.fighter_b_name}</span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-300">{fighterName}</td>
                            <td className="px-4 py-3 text-right font-mono">{b.amount.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-400">{b.odds.toFixed(2)}x</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                b.status === "won" ? "bg-[#4ade80]/10 text-[#4ade80]" :
                                b.status === "lost" ? "bg-red-500/10 text-red-400" :
                                "bg-yellow-500/10 text-yellow-400"
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {b.status === "pending" ? "—" : (b.payout ?? 0).toFixed(2)}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-bold ${
                              b.status === "pending" ? "text-gray-600" :
                              pnl >= 0 ? "text-[#4ade80]" : "text-red-400"
                            }`}>
                              {b.status === "pending" ? "—" : `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600 text-xs">
                              {new Date(b.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Market Bets Section */}
            {marketBets.length > 0 && (
              <>
                <h2 className="text-lg font-bold mb-4">Market Bets</h2>
                <div className="bg-[#161b22] rounded-xl border border-[#1c2333] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1c2333] text-[10px] text-gray-500 uppercase">
                          <th className="text-left px-4 py-3">Market</th>
                          <th className="text-left px-4 py-3">Selection</th>
                          <th className="text-right px-4 py-3">Amount</th>
                          <th className="text-right px-4 py-3">Odds</th>
                          <th className="text-center px-4 py-3">Status</th>
                          <th className="text-right px-4 py-3">Payout</th>
                          <th className="text-right px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marketBets.map((mb) => (
                          <tr key={mb.id} className="border-b border-[#1c2333]/50 hover:bg-[#0d1117]/50 transition">
                            <td className="px-4 py-3 text-gray-300 max-w-[200px] truncate">{mb.question}</td>
                            <td className="px-4 py-3 font-medium">{mb.selection}</td>
                            <td className="px-4 py-3 text-right font-mono">{mb.amount.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-400">{mb.odds.toFixed(2)}x</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                mb.status === "won" ? "bg-[#4ade80]/10 text-[#4ade80]" :
                                mb.status === "lost" ? "bg-red-500/10 text-red-400" :
                                "bg-yellow-500/10 text-yellow-400"
                              }`}>
                                {mb.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {mb.status === "pending" ? "—" : (mb.payout ?? 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600 text-xs">
                              {new Date(mb.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
