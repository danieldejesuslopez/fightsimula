"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Order {
  price: number;
  sizeA: number;
  sizeB: number;
  cumA: number;
  cumB: number;
}

interface RecentOrder {
  id: string;
  time: string;
  side: string;
  amount: number;
  odds: number;
  type: string;
}

interface LiquidityData {
  fightId: string;
  fighterA: string;
  fighterB: string;
  oddsA: number;
  oddsB: number;
  spread: number;
  totalPool: number;
  depthA: number;
  depthB: number;
  orders: Order[];
  recentOrders: RecentOrder[];
}

interface Fight {
  id: string;
  fighterA: { name: string };
  fighterB: { name: string };
  status: string;
}

export default function LiquidityPage() {
  const [fights, setFights] = useState<Fight[]>([]);
  const [selectedFight, setSelectedFight] = useState("");
  const [data, setData] = useState<LiquidityData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/fights")
      .then((r) => r.json())
      .then((d) => {
        setFights(d);
        if (d.length > 0) setSelectedFight(d[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedFight) return;
    setLoading(true);
    fetch(`/api/liquidity?fightId=${selectedFight}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedFight]);

  const maxCum = data ? Math.max(...data.orders.map((o) => Math.max(o.cumA, o.cumB)), 1) : 1;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Liquidity Pool</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">Liquidity & Order Book</h1>
        <p className="text-gray-500 text-sm mb-6">Real-time depth visualization and pool analytics</p>

        {/* Fight selector */}
        <div className="mb-6">
          <select
            value={selectedFight}
            onChange={(e) => setSelectedFight(e.target.value)}
            className="bg-[#161b22] border border-[#1c2333] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#4ade80]/50"
          >
            {fights.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fighterA.name} vs {f.fighterB.name} ({f.status})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-gray-600 text-center py-10">Loading...</p>
        ) : data ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Pool", value: `$${data.totalPool.toLocaleString()}`, color: "text-white" },
                { label: "Spread", value: data.spread.toFixed(3), color: "text-yellow-400" },
                { label: `Depth ${data.fighterA}`, value: `$${data.depthA.toLocaleString()}`, color: "text-[#4ade80]" },
                { label: `Depth ${data.fighterB}`, value: `$${data.depthB.toLocaleString()}`, color: "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Depth chart */}
            <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold">Order Book Depth</h2>
                <div className="flex gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4ade80]" /> {data.fighterA} (Buy)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {data.fighterB} (Buy)</span>
                </div>
              </div>

              <svg viewBox="0 0 700 280" className="w-full" style={{ overflow: "visible" }}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const y = 20 + (1 - t) * 240;
                  return (
                    <g key={t}>
                      <line x1="50" y1={y} x2="660" y2={y} stroke="#1c2333" strokeWidth="0.5" />
                      <text x="45" y={y + 3} textAnchor="end" fill="#4b5563" fontSize="9">
                        ${Math.round(maxCum * t)}
                      </text>
                    </g>
                  );
                })}

                {/* X-axis labels */}
                {data.orders.filter((_, i) => i % 3 === 0).map((o, i) => (
                  <text key={i} x={50 + (i * 3 / (data.orders.length - 1)) * 610} y={275} textAnchor="middle" fill="#4b5563" fontSize="9">
                    {o.price.toFixed(2)}
                  </text>
                ))}

                {/* Fighter A depth (green, left-anchored stepped area) */}
                <path
                  d={`M 50 ${20 + (1 - data.orders[0].cumA / maxCum) * 240} ` +
                    data.orders.map((o, i) => {
                      const x = 50 + (i / (data.orders.length - 1)) * 610;
                      const y = 20 + (1 - o.cumA / maxCum) * 240;
                      return `L ${x} ${y}`;
                    }).join(" ") +
                    ` L 660 260 L 50 260 Z`}
                  fill="rgba(74,222,128,0.12)"
                  stroke="#4ade80"
                  strokeWidth="1.5"
                />

                {/* Fighter B depth (red, right-anchored stepped area) */}
                <path
                  d={`M 50 260 ` +
                    data.orders.map((o, i) => {
                      const x = 50 + (i / (data.orders.length - 1)) * 610;
                      const y = 20 + (1 - o.cumB / maxCum) * 240;
                      return `L ${x} ${y}`;
                    }).join(" ") +
                    ` L 660 ${20 + (1 - data.orders[data.orders.length - 1].cumB / maxCum) * 240} L 660 260 Z`}
                  fill="rgba(239,68,68,0.12)"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                />

                {/* Spread indicator line */}
                {(() => {
                  const midIdx = Math.floor(data.orders.length / 2);
                  const x = 50 + (midIdx / (data.orders.length - 1)) * 610;
                  return (
                    <>
                      <line x1={x} y1={15} x2={x} y2={265} stroke="#eab308" strokeWidth="1" strokeDasharray="4,3" />
                      <text x={x} y={12} textAnchor="middle" fill="#eab308" fontSize="9" fontWeight="bold">
                        SPREAD {data.spread.toFixed(3)}
                      </text>
                    </>
                  );
                })()}
              </svg>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Pool composition */}
              <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4">
                <h2 className="text-sm font-bold mb-4">Pool Composition</h2>
                <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto">
                  {(() => {
                    const total = data.depthA + data.depthB || 1;
                    const pctA = data.depthA / total;
                    const angleA = pctA * 360;
                    const radA = (angleA * Math.PI) / 180;
                    const x1 = 100 + 80 * Math.sin(radA);
                    const y1 = 100 - 80 * Math.cos(radA);
                    const largeArc = angleA > 180 ? 1 : 0;
                    return (
                      <>
                        <path
                          d={`M 100 100 L 100 20 A 80 80 0 ${largeArc} 1 ${x1} ${y1} Z`}
                          fill="#4ade80"
                          opacity="0.7"
                        />
                        <path
                          d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${1 - largeArc} 1 100 20 Z`}
                          fill="#ef4444"
                          opacity="0.7"
                        />
                        <text x="100" y="95" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                          {(pctA * 100).toFixed(0)}% / {((1 - pctA) * 100).toFixed(0)}%
                        </text>
                        <text x="100" y="112" textAnchor="middle" fill="#9ca3af" fontSize="9">
                          {data.fighterA} / {data.fighterB}
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Recent orders */}
              <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4">
                <h2 className="text-sm font-bold mb-3">Recent Orders</h2>
                {data.recentOrders.length === 0 ? (
                  <p className="text-gray-600 text-xs text-center py-6">No orders yet</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-5 gap-2 text-[10px] text-gray-600 uppercase tracking-wider pb-1 border-b border-[#1c2333]">
                      <span>Time</span><span>Side</span><span>Amount</span><span>Odds</span><span>Type</span>
                    </div>
                    {data.recentOrders.map((o) => (
                      <div key={o.id} className="grid grid-cols-5 gap-2 text-xs py-1 border-b border-[#1c2333]/50">
                        <span className="text-gray-500">{new Date(o.time).toLocaleTimeString()}</span>
                        <span className={o.side === "A" ? "text-[#4ade80]" : "text-red-400"}>{o.side === "A" ? data.fighterA : data.fighterB}</span>
                        <span className="text-white font-medium">${o.amount}</span>
                        <span className="text-gray-400">{Number(o.odds).toFixed(2)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${o.type === "limit" ? "bg-blue-500/10 text-blue-400" : "bg-gray-500/10 text-gray-400"}`}>{o.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-600 text-center py-10">Select a fight to view liquidity data</p>
        )}
      </main>
    </div>
  );
}
