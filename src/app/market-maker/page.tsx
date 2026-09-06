"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Position {
  fight: string;
  side: string;
  amount: number;
  entryOdds: number;
  currentOdds: number;
  pnl: number;
}

interface ActivityEntry {
  time: string;
  action: string;
  type: string;
}

interface BotData {
  config: { active: boolean; spread: number; maxExposure: number; rebalanceThreshold: number };
  stats: { totalVolumeProvided: number; feesEarned: number; netPnL: number; uptimeHours: number; tradesExecuted: number; avgSpread: number };
  positions: Position[];
  activityLog: ActivityEntry[];
}

export default function MarketMakerPage() {
  const [data, setData] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [spread, setSpread] = useState(2.5);
  const [maxExposure, setMaxExposure] = useState(5000);
  const [rebalanceThreshold, setRebalanceThreshold] = useState(15);
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/market-maker")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setSpread(d.config.spread);
        setMaxExposure(d.config.maxExposure);
        setRebalanceThreshold(d.config.rebalanceThreshold);
        setActive(d.config.active);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const res = await fetch("/api/market-maker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spread, maxExposure, active, rebalanceThreshold }),
    });
    const updated = await res.json();
    if (data) setData({ ...data, config: updated.config });
    setSaving(false);
  };

  const toggleBot = async () => {
    const newActive = !active;
    setActive(newActive);
    await fetch("/api/market-maker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newActive }),
    });
  };

  if (loading) return <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center"><p className="text-gray-600">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Market Maker</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black">Market Maker Bot</h1>
            <p className="text-gray-500 text-sm mt-1">Automated liquidity provision and spread management</p>
          </div>
          <button
            onClick={toggleBot}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition ${active ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" : "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 hover:bg-[#4ade80]/20"}`}
          >
            {active ? "Pause Bot" : "Activate Bot"}
          </button>
        </div>

        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 ${active ? "bg-[#4ade80]/10 text-[#4ade80]" : "bg-gray-500/10 text-gray-500"}`}>
          <span className={`w-2 h-2 rounded-full ${active ? "bg-[#4ade80] animate-pulse" : "bg-gray-500"}`} />
          {active ? "Running" : "Paused"}
        </div>

        {/* Performance stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: "Volume Provided", value: `$${data.stats.totalVolumeProvided.toLocaleString()}`, color: "text-white" },
              { label: "Fees Earned", value: `$${data.stats.feesEarned.toFixed(2)}`, color: "text-[#4ade80]" },
              { label: "Net P&L", value: `${data.stats.netPnL >= 0 ? "+" : ""}$${data.stats.netPnL.toFixed(2)}`, color: data.stats.netPnL >= 0 ? "text-[#4ade80]" : "text-red-400" },
              { label: "Uptime", value: `${data.stats.uptimeHours}h`, color: "text-white" },
              { label: "Trades", value: data.stats.tradesExecuted.toString(), color: "text-blue-400" },
              { label: "Avg Spread", value: `${data.stats.avgSpread}%`, color: "text-yellow-400" },
            ].map((s) => (
              <div key={s.label} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-3">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                <p className={`text-lg font-black mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Settings */}
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4">
            <h2 className="text-sm font-bold mb-4">Bot Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Spread %</label>
                <input type="number" step="0.1" value={spread} onChange={(e) => setSpread(parseFloat(e.target.value))}
                  className="w-full mt-1 bg-[#0d1117] border border-[#1c2333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4ade80]/50" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Max Exposure ($)</label>
                <input type="number" value={maxExposure} onChange={(e) => setMaxExposure(parseInt(e.target.value))}
                  className="w-full mt-1 bg-[#0d1117] border border-[#1c2333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4ade80]/50" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Rebalance Threshold (%)</label>
                <input type="number" value={rebalanceThreshold} onChange={(e) => setRebalanceThreshold(parseInt(e.target.value))}
                  className="w-full mt-1 bg-[#0d1117] border border-[#1c2333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4ade80]/50" />
              </div>
              <button onClick={saveSettings} disabled={saving}
                className="w-full bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 rounded-lg py-2 text-sm font-bold hover:bg-[#4ade80]/20 transition disabled:opacity-50">
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          {/* Order placement visual */}
          <div className="lg:col-span-2 bg-[#161b22] rounded-xl border border-[#1c2333] p-4">
            <h2 className="text-sm font-bold mb-4">Bot Order Placement Strategy</h2>
            <svg viewBox="0 0 500 220" className="w-full">
              {/* Center line - market price */}
              <line x1="250" y1="20" x2="250" y2="200" stroke="#6b7280" strokeWidth="1" strokeDasharray="4,3" />
              <text x="250" y="15" textAnchor="middle" fill="#9ca3af" fontSize="10">Market Price</text>

              {/* Buy orders A (left, green) */}
              {[1, 2, 3, 4, 5].map((i) => {
                const x = 250 - i * 40;
                const h = 30 + (6 - i) * 20;
                return (
                  <g key={`a${i}`}>
                    <rect x={x - 15} y={200 - h} width="30" height={h} rx="3" fill="#4ade80" opacity={0.15 + (6 - i) * 0.08} />
                    <rect x={x - 15} y={200 - h} width="30" height={h} rx="3" stroke="#4ade80" strokeWidth="0.5" fill="none" />
                    <text x={x} y={210} textAnchor="middle" fill="#4b5563" fontSize="8">-{i * spread / 2}%</text>
                  </g>
                );
              })}

              {/* Buy orders B (right, red) */}
              {[1, 2, 3, 4, 5].map((i) => {
                const x = 250 + i * 40;
                const h = 30 + (6 - i) * 20;
                return (
                  <g key={`b${i}`}>
                    <rect x={x - 15} y={200 - h} width="30" height={h} rx="3" fill="#ef4444" opacity={0.15 + (6 - i) * 0.08} />
                    <rect x={x - 15} y={200 - h} width="30" height={h} rx="3" stroke="#ef4444" strokeWidth="0.5" fill="none" />
                    <text x={x} y={210} textAnchor="middle" fill="#4b5563" fontSize="8">+{i * spread / 2}%</text>
                  </g>
                );
              })}

              {/* Spread bracket */}
              <line x1={250 - 40} y1="25" x2={250 + 40} y2="25" stroke="#eab308" strokeWidth="1.5" />
              <line x1={250 - 40} y1="22" x2={250 - 40} y2="28" stroke="#eab308" strokeWidth="1.5" />
              <line x1={250 + 40} y1="22" x2={250 + 40} y2="28" stroke="#eab308" strokeWidth="1.5" />
              <text x="250" y="38" textAnchor="middle" fill="#eab308" fontSize="9" fontWeight="bold">Spread: {spread}%</text>

              {/* Labels */}
              <text x="80" y="45" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="bold">Fighter A Bids</text>
              <text x="420" y="45" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">Fighter B Bids</text>
            </svg>
          </div>
        </div>

        {/* Positions table */}
        {data && (
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 mb-6">
            <h2 className="text-sm font-bold mb-3">Active Positions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-gray-600 uppercase tracking-wider border-b border-[#1c2333]">
                    <th className="text-left py-2 pr-4">Fight</th>
                    <th className="text-left py-2 pr-4">Side</th>
                    <th className="text-right py-2 pr-4">Amount</th>
                    <th className="text-right py-2 pr-4">Entry Odds</th>
                    <th className="text-right py-2 pr-4">Current Odds</th>
                    <th className="text-right py-2">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {data.positions.map((p, i) => (
                    <tr key={i} className="border-b border-[#1c2333]/50 hover:bg-[#0d1117]/50">
                      <td className="py-2 pr-4 text-white">{p.fight}</td>
                      <td className="py-2 pr-4"><span className={`px-1.5 py-0.5 rounded text-[10px] ${p.side === "A" ? "bg-[#4ade80]/10 text-[#4ade80]" : "bg-red-500/10 text-red-400"}`}>{p.side === "A" ? "Fighter A" : "Fighter B"}</span></td>
                      <td className="py-2 pr-4 text-right text-white font-medium">${p.amount}</td>
                      <td className="py-2 pr-4 text-right text-gray-400">{p.entryOdds.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-right text-gray-400">{p.currentOdds.toFixed(2)}</td>
                      <td className={`py-2 text-right font-bold ${p.pnl >= 0 ? "text-[#4ade80]" : "text-red-400"}`}>{p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity log */}
        {data && (
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4">
            <h2 className="text-sm font-bold mb-3">Activity Log</h2>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {data.activityLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[#1c2333]/30 text-xs">
                  <span className="text-gray-600 shrink-0 w-16">{new Date(entry.time).toLocaleTimeString()}</span>
                  <span className={`shrink-0 w-2 h-2 rounded-full ${
                    entry.type === "order" ? "bg-blue-400" :
                    entry.type === "rebalance" ? "bg-yellow-400" :
                    entry.type === "cancel" ? "bg-red-400" :
                    "bg-gray-400"
                  }`} />
                  <span className="text-gray-300">{entry.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
