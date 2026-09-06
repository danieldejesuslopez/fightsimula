"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import FightChat from "@/components/FightChat";

interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

export default function LiveFightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [status, setStatus] = useState<"connecting" | "live" | "finished">("connecting");
  const [fighterA, setFighterA] = useState({ id: "", name: "Fighter A", style: "" });
  const [fighterB, setFighterB] = useState({ id: "", name: "Fighter B", style: "" });
  const [hpA, setHpA] = useState(100);
  const [hpB, setHpB] = useState(100);
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(3);
  const [oddsA, setOddsA] = useState(2.0);
  const [oddsB, setOddsB] = useState(2.0);
  const [events, setEvents] = useState<{ text: string; round: number; time: string }[]>([]);
  const [commentary, setCommentary] = useState<string[]>([]);
  const [winner, setWinner] = useState<{ id: string; name: string; method: string; round: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [excitement, setExcitement] = useState(30);
  const [roundScores, setRoundScores] = useState<{ round: number; scoreA: number; scoreB: number }[]>([]);

  // Live betting state
  const [betSide, setBetSide] = useState<"A" | "B">("A");
  const [betAmount, setBetAmount] = useState("");
  const [betPlaced, setBetPlaced] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const commentaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/fights/${id}/live`);

    eventSource.onmessage = (e) => {
      const data: SSEEvent = JSON.parse(e.data);

      switch (data.type) {
        case "fight_start":
          setFighterA(data.fighterA as typeof fighterA);
          setFighterB(data.fighterB as typeof fighterB);
          setMaxRounds(data.maxRounds as number);
          setOddsA(data.oddsA as number);
          setOddsB(data.oddsB as number);
          setStatus("live");
          break;

        case "round_start":
          setCurrentRound(data.round as number);
          setMaxRounds(data.maxRounds as number);
          if (data.commentary) {
            setCommentary(prev => [...prev, ...(data.commentary as string[])]);
          }
          setExcitement(prev => Math.min(100, prev + 10));
          break;

        case "event":
          setHpA(data.fighterA_hp as number);
          setHpB(data.fighterB_hp as number);
          setEvents(prev => [...prev, {
            text: data.text as string,
            round: data.round as number,
            time: new Date().toLocaleTimeString(),
          }]);
          if (data.commentary) {
            setCommentary(prev => [...prev, ...(data.commentary as string[])]);
          }
          // Excitement spikes on heavy hits
          const txt = (data.text as string).toLowerCase();
          if (txt.includes("heavy") || txt.includes("takedown")) {
            setExcitement(prev => Math.min(100, prev + 20));
          } else {
            setExcitement(prev => Math.max(20, prev - 3));
          }
          break;

        case "round_end":
          setRoundScores(prev => [...prev, {
            round: data.round as number,
            scoreA: data.scoreA as number,
            scoreB: data.scoreB as number,
          }]);
          if (data.commentary) {
            setCommentary(prev => [...prev, ...(data.commentary as string[])]);
          }
          setExcitement(prev => Math.max(20, prev - 15));
          break;

        case "odds_update":
          setOddsA(data.oddsA as number);
          setOddsB(data.oddsB as number);
          break;

        case "finish":
          setWinner({
            id: data.winner as string,
            name: data.winnerName as string,
            method: data.method as string,
            round: data.round as number,
          });
          setHpA(data.fighterA_hp as number);
          setHpB(data.fighterB_hp as number);
          setStatus("finished");
          setShowConfetti(true);
          setExcitement(100);
          setTimeout(() => setShowConfetti(false), 5000);
          break;

        case "already_finished":
          setStatus("finished");
          setFighterA({ id: "", name: data.fighterA as string || "Fighter A", style: "" });
          setFighterB({ id: "", name: data.fighterB as string || "Fighter B", style: "" });
          setWinner({
            id: data.winnerId as string || "",
            name: "",
            method: data.method as string || "",
            round: 0,
          });
          break;

        case "stream_end":
          eventSource.close();
          break;
      }
    };

    eventSource.onerror = () => {
      // Will auto-reconnect or we just close
    };

    return () => eventSource.close();
  }, [id]);

  // Auto-scroll feeds
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [events]);
  useEffect(() => {
    commentaryRef.current?.scrollTo({ top: commentaryRef.current.scrollHeight, behavior: "smooth" });
  }, [commentary]);

  const pA = Math.round(((1 / oddsA) / (1 / oddsA + 1 / oddsB)) * 100);
  const pB = 100 - pA;

  const placeLiveBet = async () => {
    const amount = parseFloat(betAmount) || 10;
    await fetch("/api/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fightId: id, wallet: "0xLIVE_BET", amount, side: betSide }),
    });
    setBetPlaced(true);
    setBetAmount("");
    setTimeout(() => setBetPlaced(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white relative overflow-hidden">
      {/* Confetti CSS effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `-5%`,
                width: `${6 + (i % 5) * 2}px`,
                height: `${6 + (i % 5) * 2}px`,
                backgroundColor: ["#4ade80", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899"][i % 6],
                animationDelay: `${(i % 8) * 0.25}s`,
                animationDuration: `${2 + (i % 4)}s`,
                borderRadius: i % 2 ? "50%" : "0",
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti { animation: confetti-fall linear forwards; }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.2); } 50% { box-shadow: 0 0 40px rgba(239,68,68,0.4); } }
      `}</style>

      {/* Nav */}
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">&#x1F94A;</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">&rsaquo;</span>
          <Link href="/live" className="text-sm text-gray-400 hover:text-white transition">Live</Link>
          <span className="text-gray-600">&rsaquo;</span>
          <span className="text-sm text-gray-400 truncate">{fighterA.name} vs {fighterB.name}</span>
          <div className="ml-auto flex items-center gap-2">
            {status === "live" && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-bold">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />LIVE
              </span>
            )}
            {status === "connecting" && (
              <span className="text-xs text-yellow-400 animate-pulse">Connecting...</span>
            )}
            {status === "finished" && (
              <span className="text-xs text-gray-400">Finished</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Arena header — full width dark background */}
        <div className="bg-gradient-to-br from-[#1a0a2e]/60 via-[#161b22] to-[#0a1628]/60 rounded-2xl border border-[#1c2333] overflow-hidden mb-6"
          style={status === "live" ? { animation: "pulse-glow 3s ease-in-out infinite" } : {}}>
          <div className="p-6 md:p-8">
            {/* Round indicator */}
            <div className="text-center mb-6">
              {currentRound > 0 ? (
                <div>
                  <span className="text-xs uppercase tracking-widest text-gray-500">Round</span>
                  <div className="text-4xl font-black">{currentRound} <span className="text-lg text-gray-600">of {maxRounds}</span></div>
                </div>
              ) : status === "finished" ? (
                <span className="text-xs uppercase tracking-widest text-gray-500">Fight Over</span>
              ) : (
                <span className="text-xs uppercase tracking-widest text-yellow-400 animate-pulse">Waiting for fight to start...</span>
              )}
            </div>

            {/* Fighter face-off with HP bars */}
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              {/* Fighter A */}
              <div className="text-center flex-1">
                <div className={`w-24 h-24 md:w-28 md:h-28 rounded-full border-2 flex items-center justify-center text-4xl mx-auto mb-3 transition-all duration-500 ${
                  winner?.id === fighterA.id ? "bg-green-500/20 border-green-500/50 scale-110" :
                  winner && winner.id !== fighterA.id ? "bg-red-500/10 border-red-500/20 opacity-50 scale-90" :
                  "bg-red-500/10 border-red-500/30"
                }`}>
                  &#x1F94A;
                </div>
                <h2 className="font-black text-xl md:text-2xl">{fighterA.name}</h2>
                <p className="text-xs text-gray-500 mb-2">{fighterA.style}</p>
                {/* HP Bar */}
                <div className="max-w-[160px] mx-auto">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-red-400 font-bold">HP</span>
                    <span className={hpA > 50 ? "text-green-400" : hpA > 20 ? "text-yellow-400" : "text-red-400"}>{Math.round(hpA)}%</span>
                  </div>
                  <div className="h-3 bg-[#1c2333] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        hpA > 50 ? "bg-gradient-to-r from-green-600 to-green-400" :
                        hpA > 20 ? "bg-gradient-to-r from-yellow-600 to-yellow-400" :
                        "bg-gradient-to-r from-red-600 to-red-400"
                      }`}
                      style={{ width: `${hpA}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-[#4ade80]">{pA}&#162;</span>
                </div>
              </div>

              {/* VS */}
              <div className="shrink-0 mx-6 text-center">
                <div className="w-16 h-16 rounded-full border-2 border-[#1c2333] bg-[#0d1117] flex items-center justify-center">
                  <span className="text-xl font-black text-gray-600">VS</span>
                </div>
              </div>

              {/* Fighter B */}
              <div className="text-center flex-1">
                <div className={`w-24 h-24 md:w-28 md:h-28 rounded-full border-2 flex items-center justify-center text-4xl mx-auto mb-3 transition-all duration-500 ${
                  winner?.id === fighterB.id ? "bg-green-500/20 border-green-500/50 scale-110" :
                  winner && winner.id !== fighterB.id ? "bg-red-500/10 border-red-500/20 opacity-50 scale-90" :
                  "bg-blue-500/10 border-blue-500/30"
                }`}>
                  &#x1F94A;
                </div>
                <h2 className="font-black text-xl md:text-2xl">{fighterB.name}</h2>
                <p className="text-xs text-gray-500 mb-2">{fighterB.style}</p>
                <div className="max-w-[160px] mx-auto">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-blue-400 font-bold">HP</span>
                    <span className={hpB > 50 ? "text-green-400" : hpB > 20 ? "text-yellow-400" : "text-red-400"}>{Math.round(hpB)}%</span>
                  </div>
                  <div className="h-3 bg-[#1c2333] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        hpB > 50 ? "bg-gradient-to-r from-green-600 to-green-400" :
                        hpB > 20 ? "bg-gradient-to-r from-yellow-600 to-yellow-400" :
                        "bg-gradient-to-r from-red-600 to-red-400"
                      }`}
                      style={{ width: `${hpB}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-[#4ade80]">{pB}&#162;</span>
                </div>
              </div>
            </div>

            {/* Live odds bar */}
            <div className="mt-6 max-w-md mx-auto">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-400 font-semibold">{fighterA.name} {pA}%</span>
                <span className="text-blue-400 font-semibold">{fighterB.name} {pB}%</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                <div className="bg-red-500/50 rounded-l-full transition-all duration-700" style={{ width: `${pA}%` }} />
                <div className="bg-blue-500/50 rounded-r-full transition-all duration-700" style={{ width: `${pB}%` }} />
              </div>
            </div>

            {/* Winner banner */}
            {winner && (
              <div className="mt-6 text-center py-4 bg-green-500/10 border border-green-500/30 rounded-xl max-w-lg mx-auto animate-[fadeIn_0.5s_ease-in]">
                <div className="text-3xl mb-1">&#x1F3C6;</div>
                <div className="text-2xl font-black text-green-400">{winner.name || "Winner"}</div>
                <div className="text-sm text-gray-400">
                  wins by <span className="text-white font-bold">{winner.method}</span>
                  {winner.round > 0 && <> in Round {winner.round}</>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Commentary + Events */}
          <div className="lg:col-span-2 space-y-6">
            {/* Commentary feed */}
            <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1c2333] flex items-center gap-2">
                <span className="text-sm font-bold">Live Commentary</span>
                {status === "live" && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
              </div>
              <div ref={commentaryRef} className="p-4 h-64 overflow-y-auto space-y-2">
                {commentary.length === 0 && (
                  <p className="text-gray-600 text-sm">Waiting for the fight to begin...</p>
                )}
                {commentary.map((line, i) => (
                  <div key={i} className={`text-sm ${
                    line.startsWith("Joe:") ? "text-yellow-300" :
                    line.startsWith("DC:") ? "text-blue-300" :
                    "text-gray-400"
                  }`}>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Strike-by-strike event feed */}
            <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1c2333]">
                <span className="text-sm font-bold">Event Feed</span>
              </div>
              <div ref={feedRef} className="p-4 h-72 overflow-y-auto space-y-1.5">
                {events.length === 0 && (
                  <p className="text-gray-600 text-sm">No events yet...</p>
                )}
                {events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-[#0d1117] rounded-lg px-3 py-2 border border-[#1c2333]">
                    <span className="text-[10px] text-gray-700 font-mono shrink-0 mt-0.5">{ev.time}</span>
                    <span className="text-gray-500 text-[10px] shrink-0 mt-0.5">R{ev.round}</span>
                    <span className={
                      ev.text.toLowerCase().includes("heavy") ? "text-orange-400 font-semibold" :
                      ev.text.toLowerCase().includes("takedown") ? "text-purple-400 font-semibold" :
                      "text-gray-300"
                    }>{ev.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Round scores */}
            {roundScores.length > 0 && (
              <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-4">
                <h3 className="text-sm font-bold mb-3">Scorecard</h3>
                <div className="space-y-2">
                  {roundScores.map(rs => (
                    <div key={rs.round} className="flex items-center justify-between bg-[#0d1117] rounded-lg px-4 py-2 border border-[#1c2333]">
                      <span className="text-sm font-bold">Round {rs.round}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`font-semibold ${rs.scoreA > rs.scoreB ? "text-red-400" : "text-gray-500"}`}>{rs.scoreA}</span>
                        <span className="text-gray-700">-</span>
                        <span className={`font-semibold ${rs.scoreB > rs.scoreA ? "text-blue-400" : "text-gray-500"}`}>{rs.scoreB}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Excitement meter */}
            <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-4">
              <h3 className="text-sm font-bold mb-2">Crowd Energy</h3>
              <div className="h-3 bg-[#1c2333] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${excitement}%`,
                    background: excitement > 70
                      ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                      : excitement > 40
                      ? "linear-gradient(90deg, #22c55e, #f59e0b)"
                      : "linear-gradient(90deg, #3b82f6, #22c55e)",
                  }}
                />
              </div>
              <div className="text-[10px] text-gray-500 mt-1 text-right">
                {excitement > 80 ? "ELECTRIC!" : excitement > 60 ? "Fired up" : excitement > 40 ? "Engaged" : "Warming up"}
              </div>
            </div>

            <FightChat fightId={id} />

            {/* Live odds */}
            <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-4">
              <h3 className="text-sm font-bold mb-3">Live Odds</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[#0d1117] rounded-lg p-3 border border-[#1c2333]">
                  <span className="text-sm text-red-400">{fighterA.name}</span>
                  <span className="font-bold text-[#4ade80]">{oddsA.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between items-center bg-[#0d1117] rounded-lg p-3 border border-[#1c2333]">
                  <span className="text-sm text-blue-400">{fighterB.name}</span>
                  <span className="font-bold text-[#4ade80]">{oddsB.toFixed(2)}x</span>
                </div>
              </div>
            </div>

            {/* Live betting */}
            {status === "live" && (
              <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  Live Betting
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full">OPEN</span>
                </h3>
                <div className="flex rounded-lg overflow-hidden mb-3 border border-[#1c2333]">
                  <button onClick={() => setBetSide("A")}
                    className={`flex-1 py-2 text-xs font-semibold transition ${
                      betSide === "A" ? "bg-[#0e4429] text-[#4ade80]" : "bg-[#0d1117] text-gray-500"
                    }`}>
                    {fighterA.name}
                  </button>
                  <button onClick={() => setBetSide("B")}
                    className={`flex-1 py-2 text-xs font-semibold transition ${
                      betSide === "B" ? "bg-[#1a1a3e] text-[#818cf8]" : "bg-[#0d1117] text-gray-500"
                    }`}>
                    {fighterB.name}
                  </button>
                </div>
                <input
                  type="number"
                  placeholder="Amount"
                  value={betAmount}
                  onChange={e => setBetAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#4ade80]/50"
                />
                <button onClick={placeLiveBet}
                  className="w-full py-2.5 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold rounded-xl text-sm transition">
                  Place Live Bet
                </button>
                {betPlaced && (
                  <div className="mt-2 p-2 bg-green-500/10 rounded-lg text-xs text-green-400 text-center">
                    Bet placed!
                  </div>
                )}
              </div>
            )}

            {/* Quick links */}
            {status === "finished" && (
              <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-4 space-y-2">
                <h3 className="text-sm font-bold mb-2">Post-Fight</h3>
                <Link href={`/fight/${id}`}
                  className="block w-full py-2 text-center text-sm bg-[#0d1117] border border-[#1c2333] rounded-lg hover:border-[#4ade80]/30 transition text-gray-400 hover:text-white">
                  Fight Details
                </Link>
                <Link href="/judge"
                  className="block w-full py-2 text-center text-sm bg-[#0d1117] border border-[#1c2333] rounded-lg hover:border-[#4ade80]/30 transition text-gray-400 hover:text-white">
                  Judge Scorecard
                </Link>
                <Link href="/analysis"
                  className="block w-full py-2 text-center text-sm bg-[#0d1117] border border-[#1c2333] rounded-lg hover:border-[#4ade80]/30 transition text-gray-400 hover:text-white">
                  AI Analysis
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
