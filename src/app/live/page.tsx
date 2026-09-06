"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Fighter {
  id: string; name: string; nickname: string; style: string;
  rating: number; elo?: number; wins?: number; losses?: number;
}

interface Fight {
  id: string; status: string;
  fighterA: Fighter; fighterB: Fighter;
  oddsA: number; oddsB: number;
  isMainEvent?: boolean; isCoMain?: boolean;
  totalVolume?: number; totalBets?: number;
  winnerId?: string | null; method?: string | null;
}

interface EventData {
  id: string; name: string; tagline?: string; status: string;
  fights: Fight[];
}

export default function LiveHubPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [fights, setFights] = useState<Fight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Try events API first
      try {
        const evRes = await fetch("/api/events");
        const evData: EventData[] = await evRes.json();
        if (evData.length > 0) {
          setEvents(evData);
          setLoading(false);
          return;
        }
      } catch {}

      // Fallback: load all fights
      try {
        const res = await fetch("/api/fights");
        const data = await res.json();
        setFights(data);
      } catch {}
      setLoading(false);
    }
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  // Combine fights from events or standalone
  const allFights: Fight[] = events.length > 0
    ? events.flatMap(e => e.fights)
    : fights;

  const liveFights = allFights.filter(f => f.status === "live");
  const upcomingFights = allFights.filter(f => f.status === "upcoming");
  const finishedFights = allFights.filter(f => f.status === "finished");
  const mainEvent = allFights.find(f => f.isMainEvent) || liveFights[0] || upcomingFights[0];

  const totalBetsPlaced = allFights.reduce((s, f) => s + (f.totalBets || 0), 0);
  const totalPool = allFights.reduce((s, f) => s + (f.totalVolume || 0), 0);
  // Deterministic demo audience, so the UI remains stable across renders.
  const viewers = 1200 + totalBetsPlaced * 34 + allFights.length * 11;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">Loading Fight Night...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">&#x1F94A;</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">&rsaquo;</span>
          <span className="text-sm text-gray-400">Fight Night Live</span>
          <div className="ml-auto flex items-center gap-3">
            {liveFights.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {liveFights.length} LIVE
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero banner */}
        <div className="relative bg-gradient-to-br from-[#1a0a2e] via-[#161b22] to-[#0a1628] rounded-2xl border border-[#1c2333] overflow-hidden mb-8 p-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMikiLz48L3N2Zz4=')] opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#4ade80]">Fight Night Live</span>
              {liveFights.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded-full text-[10px] text-red-400 font-bold">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />LIVE NOW
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-2">
              {events[0]?.name || "AllFights Arena"}
            </h1>
            {events[0]?.tagline && (
              <p className="text-gray-400 text-sm mb-4">{events[0].tagline}</p>
            )}

            {/* Live stats */}
            <div className="flex gap-6 mt-4">
              <div>
                <div className="text-2xl font-black text-white">{viewers.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Watching</div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#4ade80]">{totalBetsPlaced}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Bets Placed</div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#4ade80]">${totalPool.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Pool</div>
              </div>
              <div>
                <div className="text-2xl font-black text-white">{allFights.length}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Fights</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main event highlight */}
        {mainEvent && (
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              {mainEvent.isMainEvent ? "Main Event" : "Featured Fight"}
            </h2>
            <Link href={`/live/${mainEvent.id}`}>
              <div className="bg-gradient-to-r from-[#1a0a2e]/60 via-[#161b22] to-[#0a1628]/60 rounded-2xl border border-[#1c2333] p-6 hover:border-[#4ade80]/30 transition group cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-2xl mx-auto mb-2">&#x1F94A;</div>
                    <h3 className="font-black text-lg">{mainEvent.fighterA.name}</h3>
                    <p className="text-[10px] text-gray-500">{mainEvent.fighterA.style}</p>
                    {mainEvent.fighterA.wins !== undefined && (
                      <p className="text-[10px] text-gray-600">{mainEvent.fighterA.wins}W-{mainEvent.fighterA.losses}L</p>
                    )}
                  </div>
                  <div className="shrink-0 mx-6 text-center">
                    <StatusBadge status={mainEvent.status} />
                    <div className="text-lg font-black text-gray-600 mt-1">VS</div>
                    {mainEvent.winnerId && mainEvent.method && (
                      <div className="text-[10px] text-green-400 font-bold mt-1">{mainEvent.method}</div>
                    )}
                  </div>
                  <div className="text-center flex-1">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-2">&#x1F94A;</div>
                    <h3 className="font-black text-lg">{mainEvent.fighterB.name}</h3>
                    <p className="text-[10px] text-gray-500">{mainEvent.fighterB.style}</p>
                    {mainEvent.fighterB.wins !== undefined && (
                      <p className="text-[10px] text-gray-600">{mainEvent.fighterB.wins}W-{mainEvent.fighterB.losses}L</p>
                    )}
                  </div>
                </div>
                <div className="text-center mt-3 text-xs text-gray-500 group-hover:text-[#4ade80] transition">
                  Click to watch live &rarr;
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Fight cards by status */}
        {liveFights.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Live Now
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveFights.map(f => <FightCard key={f.id} fight={f} />)}
            </div>
          </section>
        )}

        {upcomingFights.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3">Upcoming</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingFights.map(f => <FightCard key={f.id} fight={f} />)}
            </div>
          </section>
        )}

        {finishedFights.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Completed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {finishedFights.map(f => <FightCard key={f.id} fight={f} />)}
            </div>
          </section>
        )}

        {allFights.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <p className="text-lg mb-2">No fights scheduled</p>
            <p className="text-sm">Check back soon for the next Fight Night</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded-full text-[10px] text-red-400 font-bold">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />LIVE
      </span>
    );
  }
  if (status === "upcoming") {
    return <span className="inline-flex px-2 py-0.5 bg-green-500/10 rounded-full text-[10px] text-green-400 font-bold">UPCOMING</span>;
  }
  return <span className="inline-flex px-2 py-0.5 bg-gray-500/10 rounded-full text-[10px] text-gray-400 font-bold">COMPLETED</span>;
}

function FightCard({ fight }: { fight: Fight }) {
  const pA = Math.round(((1 / fight.oddsA) / (1 / fight.oddsA + 1 / fight.oddsB)) * 100);
  const pB = 100 - pA;

  return (
    <Link href={`/live/${fight.id}`}>
      <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 hover:border-[#4ade80]/30 transition cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={fight.status} />
          {fight.isMainEvent && <span className="text-[10px] text-yellow-400 font-bold">MAIN EVENT</span>}
          {fight.isCoMain && <span className="text-[10px] text-orange-400 font-bold">CO-MAIN</span>}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-bold text-sm">{fight.fighterA.name}</p>
            <p className="text-[10px] text-gray-500">{fight.fighterA.style}</p>
          </div>
          <div className="shrink-0 mx-3 text-center">
            <span className="text-xs text-gray-600 font-bold">VS</span>
          </div>
          <div className="flex-1 text-right">
            <p className="font-bold text-sm">{fight.fighterB.name}</p>
            <p className="text-[10px] text-gray-500">{fight.fighterB.style}</p>
          </div>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 mt-3">
          <div className="bg-red-500/50 rounded-l-full" style={{ width: `${pA}%` }} />
          <div className="bg-blue-500/50 rounded-r-full" style={{ width: `${pB}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>{pA}%</span>
          {fight.totalVolume ? <span>${fight.totalVolume.toLocaleString()} vol</span> : null}
          <span>{pB}%</span>
        </div>
        {fight.status === "finished" && fight.winnerId && fight.method && (
          <div className="mt-2 text-center text-[10px] text-green-400 font-bold">
            Winner: {fight.winnerId === fight.fighterA.id ? fight.fighterA.name : fight.fighterB.name} by {fight.method}
          </div>
        )}
      </div>
    </Link>
  );
}
