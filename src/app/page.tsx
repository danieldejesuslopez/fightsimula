"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import WalletButton from "@/components/WalletButton";
import NotificationBell from "@/components/NotificationBell";

interface Fighter {
  id: string;
  name: string;
  nickname: string;
  style: string;
  rating: number;
  striking: number;
  grappling: number;
  cardio: number;
  chin: number;
  speed: number;
  elo?: number;
  wins?: number;
  losses?: number;
  streak?: number;
}

interface Bet {
  id: string;
  side: string;
  amount: number;
  wallet: string;
  status: string;
  payout: number | null;
}

interface Fight {
  id: string;
  status: string;
  fighterA: Fighter;
  fighterB: Fighter;
  oddsA: number;
  oddsB: number;
  winnerId: string | null;
  method: string | null;
  seedHash: string;
  serverSeed?: string;
  simLog: string | null;
  bets: Bet[];
  scheduledAt?: string;
  fightOrder?: number;
  isMainEvent?: boolean;
  isCoMain?: boolean;
}

interface FightEvent {
  id: string;
  name: string;
  tagline: string;
  status: string;
  scheduledAt: string;
  fights: Fight[];
}

function oddsToPercent(oddsA: number, oddsB: number) {
  const pA = (1 / oddsA) * 100;
  const pB = (1 / oddsB) * 100;
  const total = pA + pB;
  return { pctA: Math.round((pA / total) * 100), pctB: Math.round((pB / total) * 100) };
}

function formatCountdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Starting soon";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function FightCard({ fight, onBet, onSimulate, simulating, compact = false }: {
  fight: Fight;
  onBet: (fight: Fight, side: "A" | "B") => void;
  onSimulate: (id: string) => void;
  simulating: string | null;
  compact?: boolean;
}) {
  const { pctA, pctB } = oddsToPercent(fight.oddsA, fight.oddsB);
  const vol = fight.bets.reduce((s, b) => s + b.amount, 0);
  const betCount = fight.bets.length;

  return (
    <div className="bg-[#161b22] rounded-xl border border-[#1c2333] hover:border-[#2d3748] transition overflow-hidden group">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              fight.status === "upcoming" ? "bg-green-500/10 text-green-400" :
              fight.status === "live" ? "bg-red-500/10 text-red-400 animate-pulse" :
              "bg-gray-500/10 text-gray-400"
            }`}>
              {fight.status === "upcoming" ? "Open" : fight.status === "live" ? "LIVE" : "Settled"}
            </span>
            {fight.isMainEvent && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400">MAIN EVENT</span>
            )}
            {fight.isCoMain && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400">CO-MAIN</span>
            )}
          </div>
          {betCount > 0 && (
            <span className="text-[10px] text-gray-600">{betCount} bets</span>
          )}
        </div>

        <Link href={`/fight/${fight.id}`} className="block mb-3 hover:opacity-80 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center text-sm border border-red-500/20 shrink-0">
                🥊
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{fight.fighterA.name}</p>
                <p className="text-[10px] text-gray-600 truncate">{fight.fighterA.style} • {fight.fighterA.elo || "—"} ELO</p>
              </div>
            </div>
            <span className="text-xs text-gray-600 mx-2 shrink-0">vs</span>
            <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end text-right">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{fight.fighterB.name}</p>
                <p className="text-[10px] text-gray-600 truncate">{fight.fighterB.style} • {fight.fighterB.elo || "—"} ELO</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-sm border border-blue-500/20 shrink-0">
                🥊
              </div>
            </div>
          </div>
        </Link>

        {/* Odds bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-red-400 font-semibold">{pctA}¢</span>
            <span className="text-blue-400 font-semibold">{pctB}¢</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div className="bg-red-500/40 rounded-l-full transition-all" style={{ width: `${pctA}%` }} />
            <div className="bg-blue-500/40 rounded-r-full transition-all" style={{ width: `${pctB}%` }} />
          </div>
        </div>

        {/* Bet buttons */}
        {fight.status === "upcoming" && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onBet(fight, "A")}
              className="flex-1 py-2 bg-[#0e4429] hover:bg-[#196c3a] text-[#4ade80] text-xs font-semibold rounded-lg transition"
            >
              {fight.fighterA.name} {pctA}¢
            </button>
            <button
              onClick={() => onBet(fight, "B")}
              className="flex-1 py-2 bg-[#1a1a3e] hover:bg-[#25255e] text-[#818cf8] text-xs font-semibold rounded-lg transition"
            >
              {fight.fighterB.name} {pctB}¢
            </button>
          </div>
        )}

        {fight.status === "finished" && fight.winnerId && (
          <div className="text-center py-1.5 mb-3 bg-green-500/5 rounded-lg border border-green-500/10">
            <span className="text-xs font-bold text-green-400">
              🏆 {fight.winnerId === fight.fighterA.id ? fight.fighterA.name : fight.fighterB.name} — {fight.method}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-gray-600 pt-2 border-t border-[#1c2333]">
          <span>${vol.toLocaleString()} Vol.</span>
          <div className="flex items-center gap-3">
            {fight.status === "upcoming" && (
              <button
                onClick={() => onSimulate(fight.id)}
                disabled={simulating === fight.id}
                className="text-orange-400 hover:text-orange-300 font-semibold transition"
              >
                {simulating === fight.id ? "Simulating..." : "▶ Simulate"}
              </button>
            )}
            <Link href={`/fight/${fight.id}`} className="text-gray-500 hover:text-gray-300 transition">
              Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const categories = ["All", "MMA", "Kickboxing", "Boxing", "Muay Thai", "Wrestling"];

export default function Home() {
  const [fights, setFights] = useState<Fight[]>([]);
  const [events, setEvents] = useState<FightEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [betModal, setBetModal] = useState<{ fight: Fight; side: "A" | "B" } | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSection, setActiveSection] = useState("all");

  const fetchData = useCallback(async () => {
    const [fightsRes, eventsRes] = await Promise.all([
      fetch("/api/fights"),
      fetch("/api/events").catch(() => null),
    ]);
    const fightsData = await fightsRes.json();
    setFights(fightsData);
    if (eventsRes?.ok) {
      const eventsData = await eventsRes.json();
      setEvents(eventsData);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const seed = async () => {
    await fetch("/api/seed", { method: "POST" });
    fetchData();
  };

  const simulate = async (fightId: string) => {
    setSimulating(fightId);
    await fetch(`/api/fights/${fightId}/simulate`, { method: "POST" });
    await fetchData();
    setSimulating(null);
  };

  const placeBet = async () => {
    if (!betModal) return;
    await fetch("/api/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fightId: betModal.fight.id,
        wallet: wallet || "0xDEMO",
        amount: parseFloat(betAmount) || 10,
        side: betModal.side,
      }),
    });
    setBetModal(null);
    setBetAmount("");
    fetchData();
  };

  // Categorize fights
  const liveFights = fights.filter(f => f.status === "live");
  const upcomingFights = fights.filter(f => f.status === "upcoming");
  const settledFights = fights.filter(f => f.status === "finished");
  const mostBet = [...fights].sort((a, b) =>
    b.bets.reduce((s, bet) => s + bet.amount, 0) - a.bets.reduce((s, bet) => s + bet.amount, 0)
  ).filter(f => f.bets.length > 0);
  const biggestPool = [...fights].sort((a, b) =>
    b.bets.reduce((s, bet) => s + bet.amount, 0) - a.bets.reduce((s, bet) => s + bet.amount, 0)
  ).slice(0, 5);

  const totalVolume = fights.reduce((s, f) => s + f.bets.reduce((bs, b) => bs + b.amount, 0), 0);
  const totalBets = fights.reduce((s, f) => s + f.bets.length, 0);
  const activeEvent = events.find(e => e.status === "upcoming" || e.status === "live") || events[0];

  const sections = [
    { key: "all", label: "All Fights", icon: "🥊" },
    { key: "live", label: "Live Now", icon: "🔴", count: liveFights.length },
    { key: "upcoming", label: "Upcoming", icon: "⏰", count: upcomingFights.length },
    { key: "hot", label: "Most Bet", icon: "🔥", count: mostBet.length },
    { key: "pool", label: "Biggest Pool", icon: "💰" },
    { key: "settled", label: "Results", icon: "🏆", count: settledFights.length },
  ];

  const getFilteredFights = () => {
    switch (activeSection) {
      case "live": return liveFights;
      case "upcoming": return upcomingFights;
      case "hot": return mostBet;
      case "pool": return biggestPool;
      case "settled": return settledFights;
      default: return fights;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-sans">
      {/* ─── Navbar ─── */}
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <span className="text-2xl">🥊</span>
                <span>All<span className="text-[#4ade80]">Fights</span></span>
              </h1>
              <div className="hidden md:flex items-center bg-[#161b22] rounded-lg px-3 py-1.5">
                <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Search fights..." className="bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none w-48" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/rankings" className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#1c2333] hover:border-gray-600 rounded-lg transition hidden sm:block">
                📊 Rankings
              </Link>
              <Link href="/portfolio" className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#1c2333] hover:border-gray-600 rounded-lg transition hidden sm:block">
                💼 Portfolio
              </Link>
              <div className="relative group">
                <button className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#1c2333] hover:border-gray-600 rounded-lg transition">
                  ⚡ More
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#161b22] border border-[#1c2333] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <Link href="/predict" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333] rounded-t-lg">🧠 AI Predictor</Link>
                  <Link href="/simulate-lab" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🔬 Fight Lab</Link>
                  <Link href="/judge" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">⚖️ AI Judge</Link>
                  <Link href="/analysis" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">📈 Analysis</Link>
                  <Link href="/social" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">💬 Social</Link>
                  <Link href="/whales" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🐋 Whales</Link>
                  <Link href="/seasons" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🏆 Seasons</Link>
                  <Link href="/achievements" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🎖️ Achievements</Link>
                  <Link href="/copy-trading" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">📋 Copy Trading</Link>
                  <Link href="/referrals" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🤝 Referrals</Link>
                  <Link href="/live" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🔴 Live Fight Night</Link>
                  <Link href="/liquidity" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">💧 Liquidity</Link>
                  <Link href="/market-maker" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🤖 Market Maker</Link>
                  <Link href="/ledger" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🧾 Settlement Ledger</Link>
                  <Link href="/create-fighter" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🧬 Fighter Builder</Link>
                  <Link href="/news" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">📰 Fight News</Link>
                  <Link href="/responsible" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🛟 Safer Play</Link>
                  <Link href="/integrity" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🛡️ Integrity</Link>
                  <Link href="/security" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🔎 Security Monitor</Link>
                  <Link href="/verify" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333]">🔐 Verify</Link>
                  <Link href="/leaderboard" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1c2333] rounded-b-lg">🏅 Leaderboard</Link>
                </div>
              </div>
              <button onClick={seed} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#1c2333] hover:border-gray-600 rounded-lg transition">
                Seed
              </button>
              <NotificationBell wallet={wallet} />
              <WalletButton onConnect={(addr) => setWallet(addr)} />
            </div>
          </div>
          {/* Categories */}
          <div className="flex items-center gap-1 -mb-px overflow-x-auto pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-2 text-sm whitespace-nowrap transition border-b-2 ${
                  activeCategory === cat
                    ? "text-white border-[#4ade80]"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center text-gray-600 py-20">Loading fights...</div>
        ) : fights.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🥊</div>
            <h2 className="text-xl font-semibold mb-2">No fights yet</h2>
            <p className="text-gray-500 mb-6">Seed some demo fighters to get started</p>
            <button onClick={seed} className="px-6 py-3 bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold rounded-xl transition">
              Create Demo Fights
            </button>
          </div>
        ) : (
          <>
            {/* ═══════ FIGHT NIGHT HERO ═══════ */}
            {activeEvent && activeEvent.fights.length > 0 && (() => {
              const mainEvent = activeEvent.fights.find(f => f.isMainEvent) || activeEvent.fights[0];
              const coMain = activeEvent.fights.find(f => f.isCoMain);
              const undercard = activeEvent.fights.filter(f => !f.isMainEvent && !f.isCoMain);
              const { pctA, pctB } = oddsToPercent(mainEvent.oddsA, mainEvent.oddsB);
              const mainVol = mainEvent.bets.reduce((s, b) => s + b.amount, 0);

              return (
                <div className="mb-8 relative overflow-hidden rounded-2xl border border-[#1c2333]">
                  {/* Background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a2e] via-[#0d1117] to-[#0a1628] opacity-90" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/5 via-transparent to-transparent" />

                  <div className="relative p-6 md:p-8">
                    {/* Event header */}
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 mb-3">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Fight Night</span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tight">{activeEvent.name}</h2>
                      {activeEvent.tagline && (
                        <p className="text-sm text-gray-500 mt-1">{activeEvent.tagline}</p>
                      )}
                    </div>

                    {/* ─── Main Event ─── */}
                    <div className="max-w-2xl mx-auto mb-6">
                      <p className="text-center text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-4">🔥 Main Event</p>

                      <div className="flex items-center justify-between gap-4">
                        {/* Fighter A */}
                        <div className="flex-1 text-center">
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-3xl md:text-4xl mx-auto mb-3">
                            🥊
                          </div>
                          <h3 className="font-black text-lg md:text-xl uppercase">{mainEvent.fighterA.name}</h3>
                          <p className="text-xs text-gray-500">&quot;{mainEvent.fighterA.nickname}&quot;</p>
                          <p className="text-xs text-gray-600 mt-1">{mainEvent.fighterA.style}</p>
                          {mainEvent.fighterA.wins !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                              {mainEvent.fighterA.wins}W - {mainEvent.fighterA.losses}L
                              {(mainEvent.fighterA.streak ?? 0) > 0 && (
                                <span className="text-orange-400 ml-1">🔥{mainEvent.fighterA.streak}</span>
                              )}
                            </p>
                          )}
                          <div className="mt-3">
                            <span className="text-3xl md:text-4xl font-black text-[#4ade80]">{pctA}¢</span>
                          </div>
                        </div>

                        {/* VS */}
                        <div className="text-center shrink-0">
                          <div className="w-16 h-16 rounded-full border-2 border-[#1c2333] bg-[#0d1117] flex items-center justify-center">
                            <span className="text-xl font-black text-gray-600">VS</span>
                          </div>
                        </div>

                        {/* Fighter B */}
                        <div className="flex-1 text-center">
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center text-3xl md:text-4xl mx-auto mb-3">
                            🥊
                          </div>
                          <h3 className="font-black text-lg md:text-xl uppercase">{mainEvent.fighterB.name}</h3>
                          <p className="text-xs text-gray-500">&quot;{mainEvent.fighterB.nickname}&quot;</p>
                          <p className="text-xs text-gray-600 mt-1">{mainEvent.fighterB.style}</p>
                          {mainEvent.fighterB.wins !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                              {mainEvent.fighterB.wins}W - {mainEvent.fighterB.losses}L
                              {(mainEvent.fighterB.streak ?? 0) > 0 && (
                                <span className="text-orange-400 ml-1">🔥{mainEvent.fighterB.streak}</span>
                              )}
                            </p>
                          )}
                          <div className="mt-3">
                            <span className="text-3xl md:text-4xl font-black text-[#4ade80]">{pctB}¢</span>
                          </div>
                        </div>
                      </div>

                      {/* Pool info */}
                      <div className="text-center mt-4 space-y-2">
                        <p className="text-lg font-bold text-white">${mainVol.toLocaleString()} <span className="text-sm text-gray-500 font-normal">Pool</span></p>
                        <p className="text-xs text-gray-600">{mainEvent.bets.length} bets</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 mt-5 max-w-md mx-auto">
                        {mainEvent.status === "upcoming" ? (
                          <>
                            <button
                              onClick={() => setBetModal({ fight: mainEvent, side: "A" })}
                              className="flex-1 py-3 bg-[#0e4429] hover:bg-[#196c3a] text-[#4ade80] font-bold rounded-xl transition text-sm"
                            >
                              {mainEvent.fighterA.name} {pctA}¢
                            </button>
                            <button
                              onClick={() => setBetModal({ fight: mainEvent, side: "B" })}
                              className="flex-1 py-3 bg-[#1a1a3e] hover:bg-[#25255e] text-[#818cf8] font-bold rounded-xl transition text-sm"
                            >
                              {mainEvent.fighterB.name} {pctB}¢
                            </button>
                          </>
                        ) : mainEvent.status === "finished" ? (
                          <div className="flex-1 text-center py-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                            <span className="font-bold text-green-400">
                              🏆 {mainEvent.winnerId === mainEvent.fighterA.id ? mainEvent.fighterA.name : mainEvent.fighterB.name} wins by {mainEvent.method}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {mainEvent.status === "upcoming" && (
                        <div className="text-center mt-4">
                          <button
                            onClick={() => simulate(mainEvent.id)}
                            disabled={simulating === mainEvent.id}
                            className="px-8 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 rounded-xl font-bold text-sm transition disabled:opacity-50"
                          >
                            {simulating === mainEvent.id ? "⚡ Simulating..." : "▶ Simulate Fight"}
                          </button>
                        </div>
                      )}

                      <Link href={`/fight/${mainEvent.id}`} className="block text-center mt-3">
                        <span className="text-xs text-gray-500 hover:text-gray-300 transition">View fight details →</span>
                      </Link>
                    </div>

                    {/* ─── Undercard ─── */}
                    {(coMain || undercard.length > 0) && (
                      <div className="border-t border-[#1c2333] pt-5 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {coMain && (
                            <div className="bg-[#0d1117]/60 rounded-xl border border-[#1c2333] p-4">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">Co-Main Event</p>
                              <Link href={`/fight/${coMain.id}`} className="font-semibold text-sm hover:text-[#4ade80] transition block mb-2">
                                {coMain.fighterA.name} vs {coMain.fighterB.name}
                              </Link>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{oddsToPercent(coMain.oddsA, coMain.oddsB).pctA}¢ — {oddsToPercent(coMain.oddsA, coMain.oddsB).pctB}¢</span>
                                <span>${coMain.bets.reduce((s, b) => s + b.amount, 0).toLocaleString()}</span>
                              </div>
                              {coMain.status === "upcoming" && (
                                <div className="flex gap-2 mt-2">
                                  <button onClick={() => setBetModal({ fight: coMain, side: "A" })} className="flex-1 py-1.5 bg-[#0e4429] hover:bg-[#196c3a] text-[#4ade80] text-[10px] font-semibold rounded-lg transition">
                                    {coMain.fighterA.name}
                                  </button>
                                  <button onClick={() => setBetModal({ fight: coMain, side: "B" })} className="flex-1 py-1.5 bg-[#1a1a3e] hover:bg-[#25255e] text-[#818cf8] text-[10px] font-semibold rounded-lg transition">
                                    {coMain.fighterB.name}
                                  </button>
                                </div>
                              )}
                              {coMain.status === "finished" && (
                                <p className="text-[10px] text-green-400 font-bold mt-2">
                                  🏆 {coMain.winnerId === coMain.fighterA.id ? coMain.fighterA.name : coMain.fighterB.name} — {coMain.method}
                                </p>
                              )}
                            </div>
                          )}
                          {undercard.map(f => {
                            const { pctA: uA, pctB: uB } = oddsToPercent(f.oddsA, f.oddsB);
                            return (
                              <div key={f.id} className="bg-[#0d1117]/60 rounded-xl border border-[#1c2333] p-4">
                                <Link href={`/fight/${f.id}`} className="font-semibold text-sm hover:text-[#4ade80] transition block mb-2">
                                  {f.fighterA.name} vs {f.fighterB.name}
                                </Link>
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>{uA}¢ — {uB}¢</span>
                                  <span>${f.bets.reduce((s, b) => s + b.amount, 0).toLocaleString()}</span>
                                </div>
                                {f.status === "upcoming" && (
                                  <div className="flex gap-2 mt-2">
                                    <button onClick={() => setBetModal({ fight: f, side: "A" })} className="flex-1 py-1.5 bg-[#0e4429] hover:bg-[#196c3a] text-[#4ade80] text-[10px] font-semibold rounded-lg transition">
                                      {f.fighterA.name}
                                    </button>
                                    <button onClick={() => setBetModal({ fight: f, side: "B" })} className="flex-1 py-1.5 bg-[#1a1a3e] hover:bg-[#25255e] text-[#818cf8] text-[10px] font-semibold rounded-lg transition">
                                      {f.fighterB.name}
                                    </button>
                                  </div>
                                )}
                                {f.status === "finished" && (
                                  <p className="text-[10px] text-green-400 font-bold mt-2">
                                    🏆 {f.winnerId === f.fighterA.id ? f.fighterA.name : f.fighterB.name} — {f.method}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ═══════ STATS BAR ═══════ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Volume", value: `$${totalVolume.toLocaleString()}`, icon: "💰" },
                { label: "Total Bets", value: totalBets.toLocaleString(), icon: "🎯" },
                { label: "Active Markets", value: upcomingFights.length.toString(), icon: "📈" },
                { label: "Live Fights", value: liveFights.length.toString(), icon: "🔴" },
              ].map(stat => (
                <div key={stat.label} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-3 text-center">
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-[10px] text-gray-500">{stat.icon} {stat.label}</p>
                </div>
              ))}
            </div>

            {/* ═══════ SECTION TABS ═══════ */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {sections.map(sec => (
                <button
                  key={sec.key}
                  onClick={() => setActiveSection(sec.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition ${
                    activeSection === sec.key
                      ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"
                      : "bg-[#161b22] text-gray-500 border border-[#1c2333] hover:text-gray-300"
                  }`}
                >
                  <span>{sec.icon}</span>
                  <span>{sec.label}</span>
                  {sec.count !== undefined && sec.count > 0 && (
                    <span className="bg-[#1c2333] text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">{sec.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ═══════ LIVE NOW BANNER ═══════ */}
            {liveFights.length > 0 && activeSection === "all" && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">Live Now</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveFights.map(f => (
                    <FightCard key={f.id} fight={f} onBet={(fight, side) => setBetModal({ fight, side })} onSimulate={simulate} simulating={simulating} />
                  ))}
                </div>
              </div>
            )}

            {/* ═══════ FIGHT CARDS GRID ═══════ */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {sections.find(s => s.key === activeSection)?.icon} {sections.find(s => s.key === activeSection)?.label}
              </h3>
              <span className="text-xs text-gray-600">{getFilteredFights().length} fights</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredFights().map(fight => (
                <FightCard
                  key={fight.id}
                  fight={fight}
                  onBet={(f, side) => setBetModal({ fight: f, side })}
                  onSimulate={simulate}
                  simulating={simulating}
                />
              ))}
            </div>

            {getFilteredFights().length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <p className="text-sm">No fights in this category</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* ─── Bet Modal ─── */}
      {betModal && (() => {
        const { pctA, pctB } = oddsToPercent(betModal.fight.oddsA, betModal.fight.oddsB);
        const fighter = betModal.side === "A" ? betModal.fight.fighterA : betModal.fight.fighterB;
        const pct = betModal.side === "A" ? pctA : pctB;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setBetModal(null)}>
            <div className="bg-[#161b22] rounded-2xl max-w-sm w-full mx-4 border border-[#1c2333] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Place Trade</h2>
                  <button onClick={() => setBetModal(null)} className="text-gray-500 hover:text-white text-xl">×</button>
                </div>

                <div className="bg-[#0d1117] rounded-xl p-4 mb-4 border border-[#1c2333]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">🥊</div>
                    <div>
                      <p className="font-semibold">{fighter.name}</p>
                      <p className="text-xs text-gray-500">{fighter.nickname} • {fighter.style}</p>
                    </div>
                    <span className="ml-auto text-xl font-bold text-[#4ade80]">{pct}¢</span>
                  </div>
                  <p className="text-[10px] text-gray-600">
                    {betModal.fight.fighterA.name} vs {betModal.fight.fighterB.name}
                  </p>
                </div>

                <label className="block text-xs text-gray-500 mb-1.5">Wallet</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#4ade80]/50 transition"
                />

                <label className="block text-xs text-gray-500 mb-1.5">Amount (USDT)</label>
                <input
                  type="number"
                  placeholder="100"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm mb-2 focus:outline-none focus:border-[#4ade80]/50 transition"
                />

                {betAmount && (
                  <div className="text-xs text-gray-500 mb-4 space-y-1">
                    <div className="flex justify-between">
                      <span>Avg price</span>
                      <span>{pct}¢</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shares</span>
                      <span>{((parseFloat(betAmount) || 0) / (pct / 100)).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-[#4ade80] font-semibold">
                      <span>Potential return</span>
                      <span>${((parseFloat(betAmount) || 0) * (betModal.side === "A" ? betModal.fight.oddsA : betModal.fight.oddsB)).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={placeBet}
                  className="w-full py-3 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold rounded-xl text-sm transition"
                >
                  Buy Yes
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
