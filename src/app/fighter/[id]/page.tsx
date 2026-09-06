"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface FighterData {
  id: string;
  name: string;
  nickname: string;
  weight: number;
  height: number;
  reach: number;
  style: string;
  avatar: string | null;
  rating: number;
  striking: number;
  grappling: number;
  cardio: number;
  chin: number;
  speed: number;
  elo: number;
  wins: number;
  losses: number;
  streak: number;
  ko_wins: number;
  sub_wins: number;
  dec_wins: number;
  fightHistory: FightRecord[];
}

interface FightRecord {
  id: string;
  fightId: string;
  opponent: { id: string; name: string };
  result: string;
  method: string;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
  date: string;
}

// ── SVG Radar Chart ──
function RadarChart({ stats }: { stats: { label: string; value: number }[] }) {
  const cx = 150, cy = 150, r = 110;
  const n = stats.length;
  const angles = stats.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);

  const pointAt = (angle: number, dist: number) => ({
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * dist,
  });

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const dataPoints = stats.map((s, i) => pointAt(angles[i], (s.value / 100) * r));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[280px] mx-auto">
      {/* Grid */}
      {gridLevels.map((level) => {
        const pts = angles.map((a) => pointAt(a, r * level));
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
        return <path key={level} d={path} fill="none" stroke="#1c2333" strokeWidth="1" />;
      })}
      {/* Axes */}
      {angles.map((a, i) => {
        const end = pointAt(a, r);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#1c2333" strokeWidth="1" />;
      })}
      {/* Data fill */}
      <path d={dataPath} fill="rgba(74, 222, 128, 0.15)" stroke="#4ade80" strokeWidth="2" />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#4ade80" />
      ))}
      {/* Labels */}
      {stats.map((s, i) => {
        const lp = pointAt(angles[i], r + 22);
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" className="fill-gray-400 text-[11px] font-semibold">
            {s.label} {s.value}
          </text>
        );
      })}
    </svg>
  );
}

// ── Donut Chart ──
function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return <p className="text-gray-600 text-sm text-center">No wins yet</p>;

  const cx = 80, cy = 80, r = 60, inner = 38;
  let cumAngle = -Math.PI / 2;

  const arcs = slices.filter(s => s.value > 0).map((sl) => {
    const angle = (sl.value / total) * Math.PI * 2;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = cx + Math.cos(startAngle) * r;
    const y1 = cy + Math.sin(startAngle) * r;
    const x2 = cx + Math.cos(endAngle) * r;
    const y2 = cy + Math.sin(endAngle) * r;
    const ix1 = cx + Math.cos(endAngle) * inner;
    const iy1 = cy + Math.sin(endAngle) * inner;
    const ix2 = cx + Math.cos(startAngle) * inner;
    const iy2 = cy + Math.sin(startAngle) * inner;

    const d = `M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} L${ix1},${iy1} A${inner},${inner} 0 ${largeArc} 0 ${ix2},${iy2} Z`;

    return { ...sl, d, pct: Math.round((sl.value / total) * 100) };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-32 h-32 shrink-0">
        {arcs.map((a) => (
          <path key={a.label} d={a.d} fill={a.color} opacity="0.85" />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-white text-lg font-black">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-gray-500 text-[10px]">WINS</text>
      </svg>
      <div className="space-y-2">
        {arcs.map((a) => (
          <div key={a.label} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: a.color }} />
            <span className="text-gray-400">{a.label}</span>
            <span className="text-white font-bold">{a.value}</span>
            <span className="text-gray-600 text-xs">({a.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ELO Line Chart ──
function EloChart({ history }: { history: FightRecord[] }) {
  const points = [...history].reverse();
  if (points.length < 2) return null;

  const eloValues = [points[0].eloBefore, ...points.map(p => p.eloAfter)];
  const w = 500, h = 140, pad = 30;
  const maxE = Math.max(...eloValues) + 20;
  const minE = Math.min(...eloValues) - 20;
  const range = maxE - minE || 1;

  const toX = (i: number) => pad + (i / (eloValues.length - 1)) * (w - pad * 2);
  const toY = (v: number) => h - pad - ((v - minE) / range) * (h - pad * 2);

  const pathD = eloValues.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#1c2333" strokeWidth="1" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#1c2333" strokeWidth="1" />
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(pct => {
        const y = h - pad - pct * (h - pad * 2);
        const val = Math.round(minE + pct * range);
        return (
          <g key={pct}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#1c2333" strokeWidth="0.5" strokeDasharray="4" />
            <text x={pad - 4} y={y + 3} textAnchor="end" className="fill-gray-600 text-[9px]">{val}</text>
          </g>
        );
      })}
      <path d={pathD} fill="none" stroke="#4ade80" strokeWidth="2.5" />
      {eloValues.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill="#4ade80" />
      ))}
      {/* Start/end labels */}
      <text x={toX(0)} y={toY(eloValues[0]) - 8} textAnchor="middle" className="fill-gray-400 text-[10px] font-semibold">{eloValues[0]}</text>
      <text x={toX(eloValues.length - 1)} y={toY(eloValues[eloValues.length - 1]) - 8} textAnchor="middle" className="fill-[#4ade80] text-[10px] font-bold">{eloValues[eloValues.length - 1]}</text>
    </svg>
  );
}

// ── Fighter Comparison ──
function CompareSection({ fighter, allFighters }: { fighter: FighterData; allFighters: FighterData[] }) {
  const [compareId, setCompareId] = useState("");
  const [compareData, setCompareData] = useState<FighterData | null>(null);

  useEffect(() => {
    if (!compareId) { setCompareData(null); return; }
    fetch(`/api/fighters/${compareId}`)
      .then(r => r.json())
      .then(setCompareData)
      .catch(() => setCompareData(null));
  }, [compareId]);

  const statKeys = ["striking", "grappling", "cardio", "chin", "speed"] as const;

  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Compare With...</h3>
        <select
          value={compareId}
          onChange={(e) => setCompareId(e.target.value)}
          className="bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm px-3 py-1.5 text-white focus:outline-none focus:border-[#4ade80]/50"
        >
          <option value="">Select fighter</option>
          {allFighters.filter(f => f.id !== fighter.id).map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {compareData && (
        <div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
            <div className="text-[#4ade80] font-semibold">{fighter.name}</div>
            <div className="text-gray-600">VS</div>
            <div className="text-blue-400 font-semibold">{compareData.name}</div>
          </div>

          {/* Tape */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4 pb-4 border-b border-[#1c2333]">
            {[
              { label: "ELO", a: fighter.elo, b: compareData.elo },
              { label: "Record", a: `${fighter.wins}-${fighter.losses}`, b: `${compareData.wins}-${compareData.losses}` },
              { label: "Streak", a: fighter.streak, b: compareData.streak },
            ].map(s => (
              <div key={s.label} className="contents">
                <div className="text-white font-semibold">{s.a}</div>
                <div className="text-gray-600">{s.label}</div>
                <div className="text-white font-semibold">{s.b}</div>
              </div>
            ))}
          </div>

          {/* Stat bars */}
          {statKeys.map(key => {
            const vA = fighter[key];
            const vB = compareData[key];
            return (
              <div key={key} className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span className={vA > vB ? "text-[#4ade80] font-semibold" : ""}>{vA}</span>
                  <span className="text-gray-600 capitalize">{key}</span>
                  <span className={vB > vA ? "text-blue-400 font-semibold" : ""}>{vB}</span>
                </div>
                <div className="flex gap-1 h-2">
                  <div className="flex-1 bg-[#1c2333] rounded-l-full overflow-hidden flex justify-end">
                    <div className="bg-[#4ade80]/60 rounded-l-full transition-all" style={{ width: `${vA}%` }} />
                  </div>
                  <div className="flex-1 bg-[#1c2333] rounded-r-full overflow-hidden">
                    <div className="bg-blue-500/60 rounded-r-full transition-all" style={{ width: `${vB}%` }} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Physical */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs mt-4 pt-4 border-t border-[#1c2333]">
            {[
              { label: "Weight", a: `${fighter.weight}kg`, b: `${compareData.weight}kg` },
              { label: "Height", a: `${fighter.height}cm`, b: `${compareData.height}cm` },
              { label: "Reach", a: `${fighter.reach}cm`, b: `${compareData.reach}cm` },
            ].map(s => (
              <div key={s.label} className="contents">
                <div className="text-white font-semibold">{s.a}</div>
                <div className="text-gray-600">{s.label}</div>
                <div className="text-white font-semibold">{s.b}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!compareData && compareId === "" && (
        <p className="text-gray-600 text-xs text-center py-4">Select a fighter above to compare stats side by side</p>
      )}
    </div>
  );
}

// ── Main Page ──
export default function FighterProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [fighter, setFighter] = useState<FighterData | null>(null);
  const [allFighters, setAllFighters] = useState<FighterData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/fighters/${id}`).then(r => r.json()),
      fetch("/api/fighters").then(r => r.json()),
    ]).then(([f, all]) => {
      setFighter(f);
      setAllFighters(all);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center text-gray-500">Loading...</div>;
  if (!fighter) return <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center text-gray-500">Fighter not found</div>;

  const totalFights = fighter.wins + fighter.losses;
  const totalWins = fighter.ko_wins + fighter.sub_wins + fighter.dec_wins;
  const finishRate = totalWins > 0 ? Math.round(((fighter.ko_wins + fighter.sub_wins) / totalWins) * 100) : 0;

  // Avg fight duration from history (rough: count rounds from method)
  const history = fighter.fightHistory || [];

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Nav */}
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">&#x1F94A;</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">&rsaquo;</span>
          <Link href="/rankings" className="text-sm text-gray-400 hover:text-gray-300 transition">Rankings</Link>
          <span className="text-gray-600">&rsaquo;</span>
          <span className="text-sm text-gray-400 truncate">{fighter.name}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* ═══ HERO ═══ */}
        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] overflow-hidden">
          <div className="bg-gradient-to-br from-[#0a2e1a]/40 via-transparent to-[#0d1117] p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="w-28 h-28 rounded-full bg-[#4ade80]/10 border-2 border-[#4ade80]/30 flex items-center justify-center text-5xl shrink-0">
                &#x1F94A;
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-1">
                  <h1 className="text-3xl font-black">{fighter.name}</h1>
                  <span className="px-2 py-0.5 bg-[#4ade80]/10 text-[#4ade80] text-xs font-semibold rounded-full border border-[#4ade80]/20">
                    {fighter.style}
                  </span>
                </div>
                {fighter.nickname && (
                  <p className="text-gray-500 text-sm mb-3">&quot;{fighter.nickname}&quot;</p>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                  {/* ELO */}
                  <div className="text-center">
                    <p className="text-2xl font-black text-[#4ade80]">{fighter.elo}</p>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">ELO</p>
                  </div>
                  {/* Record */}
                  <div className="text-center">
                    <p className="text-2xl font-black">{fighter.wins}<span className="text-gray-600">-</span>{fighter.losses}</p>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">Record</p>
                  </div>
                  {/* Streak */}
                  <div className="text-center">
                    {fighter.streak > 0 ? (
                      <p className="text-2xl font-black text-orange-400">W{fighter.streak}</p>
                    ) : fighter.streak < 0 ? (
                      <p className="text-2xl font-black text-red-400">L{Math.abs(fighter.streak)}</p>
                    ) : (
                      <p className="text-2xl font-black text-gray-500">--</p>
                    )}
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">Streak</p>
                  </div>
                  {/* Rating */}
                  <div className="text-center">
                    <p className="text-2xl font-black">{fighter.rating}</p>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">OVR</p>
                  </div>
                </div>

                <Link
                  href="/"
                  className="inline-block px-5 py-2 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold rounded-xl text-sm transition"
                >
                  Create Fight
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═══ RADAR CHART ═══ */}
          <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Skill Radar</h3>
            <RadarChart stats={[
              { label: "STR", value: fighter.striking },
              { label: "GRP", value: fighter.grappling },
              { label: "CRD", value: fighter.cardio },
              { label: "CHN", value: fighter.chin },
              { label: "SPD", value: fighter.speed },
            ]} />
          </div>

          {/* ═══ TALE OF THE TAPE ═══ */}
          <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Tale of the Tape</h3>
            <div className="space-y-4">
              {[
                { label: "Weight", value: `${fighter.weight} kg` },
                { label: "Height", value: `${fighter.height} cm` },
                { label: "Reach", value: `${fighter.reach} cm` },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#1c2333] last:border-0">
                  <span className="text-gray-500 text-sm">{item.label}</span>
                  <span className="text-white font-semibold">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Stats breakdown */}
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mt-6 mb-4">Stats Breakdown</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "KO Wins", value: fighter.ko_wins, color: "text-red-400" },
                { label: "SUB Wins", value: fighter.sub_wins, color: "text-purple-400" },
                { label: "DEC Wins", value: fighter.dec_wins, color: "text-blue-400" },
                { label: "Finish Rate", value: `${finishRate}%`, color: "text-[#4ade80]" },
                { label: "Total Fights", value: totalFights, color: "text-white" },
                { label: "Win Rate", value: totalFights > 0 ? `${Math.round((fighter.wins / totalFights) * 100)}%` : "--", color: "text-[#4ade80]" },
              ].map(s => (
                <div key={s.label} className="bg-[#0d1117] rounded-xl p-3 border border-[#1c2333]">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ WIN METHOD DISTRIBUTION ═══ */}
        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Win Method Distribution</h3>
          <DonutChart slices={[
            { label: "KO/TKO", value: fighter.ko_wins, color: "#ef4444" },
            { label: "Submission", value: fighter.sub_wins, color: "#a855f7" },
            { label: "Decision", value: fighter.dec_wins, color: "#3b82f6" },
          ]} />
        </div>

        {/* ═══ ELO HISTORY ═══ */}
        {history.length >= 2 && (
          <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">ELO History</h3>
            <EloChart history={history} />
          </div>
        )}

        {/* ═══ FIGHT HISTORY ═══ */}
        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Fight History</h3>
          {history.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">No fights recorded yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <Link key={h.id} href={`/fight/${h.fightId}`} className="block">
                  <div className={`flex items-center justify-between p-4 rounded-xl border transition hover:border-[#2d3748] ${
                    h.result === "win"
                      ? "bg-green-500/5 border-green-500/10"
                      : "bg-red-500/5 border-red-500/10"
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                        h.result === "win" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {h.result === "win" ? "W" : "L"}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">vs {h.opponent.name}</p>
                        <p className="text-[10px] text-gray-600">
                          {h.method} &middot; {h.date ? new Date(h.date).toLocaleDateString() : "--"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${h.eloChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {h.eloChange >= 0 ? "+" : ""}{h.eloChange}
                      </p>
                      <p className="text-[10px] text-gray-600">ELO {h.eloAfter}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ═══ COMPARE ═══ */}
        <CompareSection fighter={fighter} allFighters={allFighters} />
      </main>
    </div>
  );
}
