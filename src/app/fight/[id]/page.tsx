"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import Link from "next/link";
import { useLiveOdds } from "@/lib/useLiveOdds";
import { placeBetOnChain, isContractDeployed } from "@/lib/contract";
import FightChat from "@/components/FightChat";

interface Fighter {
  id: string; name: string; nickname: string; style: string;
  rating: number; striking: number; grappling: number; cardio: number; chin: number; speed: number;
  weight: number; height: number; reach: number;
  elo?: number; wins?: number; losses?: number; streak?: number;
  ko_wins?: number; sub_wins?: number; dec_wins?: number;
}

interface Bet {
  id: string; side: string; amount: number; wallet: string; status: string; payout: number | null; odds: number;
  created_at?: string;
}

interface Fight {
  id: string; status: string;
  fighterA: Fighter; fighterB: Fighter;
  oddsA: number; oddsB: number;
  winnerId: string | null; method: string | null;
  seedHash: string; serverSeed?: string; simLog: string | null;
  videoUrl?: string | null; videoStatus?: string | null;
  bets: Bet[];
}

interface VideoState {
  status: string; videoUrl?: string | null; error?: string | null;
  providerConfigured: boolean; provider: string;
}

interface RoundResult {
  round: number; scoreA: number; scoreB: number;
  events: string[]; finish?: { winner: string; method: string };
}

interface OddsHistoryEntry {
  oddsA: number; oddsB: number; poolA: number; poolB: number; totalBets: number; timestamp: string;
}

interface Market {
  id: string; type: string; question: string; options: string[]; status: string; result: string | null;
  bets: Record<string, { total: number; count: number }>;
}

function StatBar({ label, valA, valB }: { label: string; valA: number; valB: number }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span className={valA > valB ? "text-red-400 font-semibold" : ""}>{valA}</span>
        <span className="text-gray-600">{label}</span>
        <span className={valB > valA ? "text-blue-400 font-semibold" : ""}>{valB}</span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 bg-[#1c2333] rounded-l-full overflow-hidden flex justify-end">
          <div className="bg-red-500/60 rounded-l-full transition-all" style={{ width: `${valA}%` }} />
        </div>
        <div className="flex-1 bg-[#1c2333] rounded-r-full overflow-hidden">
          <div className="bg-blue-500/60 rounded-r-full transition-all" style={{ width: `${valB}%` }} />
        </div>
      </div>
    </div>
  );
}

function OddsChart({ history }: { history: OddsHistoryEntry[] }) {
  if (history.length < 2) return null;
  const w = 400, h = 120, pad = 20;
  const maxOdds = Math.max(...history.map(h => Math.max(h.oddsA, h.oddsB)), 3);
  const minOdds = Math.min(...history.map(h => Math.min(h.oddsA, h.oddsB)), 1);
  const range = maxOdds - minOdds || 1;

  const toX = (i: number) => pad + (i / (history.length - 1)) * (w - pad * 2);
  const toY = (v: number) => h - pad - ((v - minOdds) / range) * (h - pad * 2);

  const pathA = history.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(p.oddsA)}`).join(" ");
  const pathB = history.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(p.oddsB)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#1c2333" strokeWidth="1" />
      <path d={pathA} fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.7" />
      <path d={pathB} fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.7" />
      {history.length > 0 && (
        <>
          <circle cx={toX(history.length - 1)} cy={toY(history[history.length - 1].oddsA)} r="3" fill="#ef4444" />
          <circle cx={toX(history.length - 1)} cy={toY(history[history.length - 1].oddsB)} r="3" fill="#3b82f6" />
        </>
      )}
    </svg>
  );
}

export default function FightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [fight, setFight] = useState<Fight | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [betSide, setBetSide] = useState<"A" | "B">("A");
  const [betAmount, setBetAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [showBetPanel, setShowBetPanel] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"arena" | "markets" | "activity" | "verify">("arena");
  const [oddsHistory, setOddsHistory] = useState<OddsHistoryEntry[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChain = isContractDeployed();
  const { odds: liveOdds, connected: liveConnected } = useLiveOdds(id);
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const [videoRequesting, setVideoRequesting] = useState(false);

  const fetchFight = useCallback(async () => {
    const res = await fetch("/api/fights");
    const fights = await res.json();
    const found = fights.find((f: Fight) => f.id === id);
    setFight(found || null);
    setLoading(false);
  }, [id]);

  const fetchOddsHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/fights/${id}/odds-history`);
      if (res.ok) setOddsHistory(await res.json());
    } catch {}
  }, [id]);

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch(`/api/markets?fightId=${id}`);
      if (res.ok) setMarkets(await res.json());
    } catch {}
  }, [id]);

  useEffect(() => { fetchFight(); fetchOddsHistory(); fetchMarkets(); }, [fetchFight, fetchOddsHistory, fetchMarkets]);

  const fetchVideoStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/fights/${id}/video`);
      if (res.ok) setVideoState(await res.json());
    } catch {}
  }, [id]);

  const requestVideo = async () => {
    setVideoRequesting(true);
    try {
      const res = await fetch(`/api/fights/${id}/video`, { method: "POST" });
      if (res.ok) setVideoState(await res.json());
    } finally {
      setVideoRequesting(false);
    }
  };

  useEffect(() => {
    if (!fight || fight.status !== "finished") return;
    fetchVideoStatus();
  }, [fight?.status, fetchVideoStatus]);

  useEffect(() => {
    if (!videoState || (videoState.status !== "queued" && videoState.status !== "processing")) return;
    const t = setInterval(fetchVideoStatus, 5000);
    return () => clearInterval(t);
  }, [videoState, fetchVideoStatus]);

  const simulate = async () => {
    setSimulating(true);
    await fetch(`/api/fights/${id}/simulate`, { method: "POST" });
    await fetchFight();
    await fetchOddsHistory();
    await fetchMarkets();
    setSimulating(false);
  };

  const placeBet = async () => {
    if (!fight) return;
    setTxError(null); setTxHash(null);
    const amount = parseFloat(betAmount) || 10;
    const betWallet = wallet || "0xDEMO";

    if (onChain && typeof window !== "undefined" && window.ethereum) {
      try {
        setTxPending(true);
        const result = await placeBetOnChain(id, betSide, (amount / 1e18 < 0.0001 ? "0.001" : betAmount));
        setTxHash(result.txHash);
        await fetch("/api/bets", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fightId: id, wallet: betWallet, amount, side: betSide, txHash: result.txHash }),
        });
      } catch (err: unknown) {
        setTxError(err instanceof Error ? err.message : "Transaction failed");
        setTxPending(false); return;
      }
      setTxPending(false);
    } else {
      await fetch("/api/bets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fightId: id, wallet: betWallet, amount, side: betSide }),
      });
    }
    setBetAmount(""); setShowBetPanel(false);
    fetchFight(); fetchOddsHistory();
  };

  const getRoundLog = (): RoundResult[] => {
    if (!fight?.simLog) return [];
    try { return JSON.parse(fight.simLog); } catch { return []; }
  };

  // Playback controls
  const rounds = getRoundLog();
  const startPlayback = () => {
    if (rounds.length === 0) return;
    setIsPlaying(true);
    setPlaybackIndex(0);
  };

  useEffect(() => {
    if (!isPlaying || playbackIndex < 0) return;
    if (playbackIndex >= rounds.length) {
      setIsPlaying(false); return;
    }
    const events = rounds[playbackIndex]?.events || [];
    const delay = 1500 + events.length * 400;
    playbackRef.current = setTimeout(() => setPlaybackIndex(i => i + 1), delay);
    return () => { if (playbackRef.current) clearTimeout(playbackRef.current); };
  }, [isPlaying, playbackIndex, rounds]);

  if (loading) return <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center text-gray-500">Loading...</div>;
  if (!fight) return <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center text-gray-500">Fight not found</div>;

  const effectiveOddsA = liveOdds?.oddsA ?? fight.oddsA;
  const effectiveOddsB = liveOdds?.oddsB ?? fight.oddsB;
  const pA = Math.round(((1 / effectiveOddsA) / (1 / effectiveOddsA + 1 / effectiveOddsB)) * 100);
  const pB = 100 - pA;
  const totalVol = (liveOdds?.poolA ?? 0) + (liveOdds?.poolB ?? 0) || fight.bets.reduce((s, b) => s + b.amount, 0);

  // HP calculation from sim log
  let hpA = 100, hpB = 100;
  const maxRound = playbackIndex >= 0 ? Math.min(playbackIndex + 1, rounds.length) : rounds.length;
  for (let i = 0; i < maxRound; i++) {
    const r = rounds[i];
    const dmgToB = Math.max(0, r.scoreA - 10) * 5;
    const dmgToA = Math.max(0, r.scoreB - 10) * 5;
    hpB = Math.max(0, hpB - dmgToB);
    hpA = Math.max(0, hpA - dmgToA);
    if (r.finish) {
      if (r.finish.winner === "A") hpB = 0;
      else hpA = 0;
    }
  }

  const tabs = [
    { key: "arena", label: "Arena", icon: "🥊" },
    { key: "markets", label: "Markets", icon: "📊" },
    { key: "activity", label: "Activity", icon: "📋" },
    { key: "verify", label: "Verify", icon: "🔐" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Nav */}
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400 truncate">{fight.fighterA.name} vs {fight.fighterB.name}</span>
          <div className="ml-auto flex items-center gap-2">
            {liveConnected && (
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />LIVE
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              fight.status === "upcoming" ? "bg-green-500/10 text-green-400" :
              fight.status === "live" ? "bg-red-500/10 text-red-400" : "bg-gray-500/10 text-gray-400"
            }`}>
              {fight.status === "upcoming" ? "Open" : fight.status === "live" ? "LIVE" : "Settled"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* ═══════ FIGHT ARENA HEADER ═══════ */}
        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] overflow-hidden mb-6">
          <div className="bg-gradient-to-br from-[#1a0a2e]/50 via-transparent to-[#0a1628]/50 p-6">
            {/* Fighters face-off */}
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              {/* Fighter A */}
              <div className="text-center flex-1">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-3xl mx-auto mb-2">
                  🥊
                </div>
                <h2 className="font-black text-lg md:text-xl">{fight.fighterA.name}</h2>
                <p className="text-xs text-gray-500">&quot;{fight.fighterA.nickname}&quot; • {fight.fighterA.style}</p>
                {fight.fighterA.wins !== undefined && (
                  <p className="text-[10px] text-gray-600 mt-1">
                    {fight.fighterA.wins}W-{fight.fighterA.losses}L
                    {(fight.fighterA.streak ?? 0) > 0 && <span className="text-orange-400 ml-1">🔥W{fight.fighterA.streak}</span>}
                  </p>
                )}
                {/* HP Bar */}
                {rounds.length > 0 && (
                  <div className="mt-2 max-w-[140px] mx-auto">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-red-400">HP</span>
                      <span className={hpA > 50 ? "text-green-400" : hpA > 20 ? "text-yellow-400" : "text-red-400"}>{Math.round(hpA)}%</span>
                    </div>
                    <div className="h-2.5 bg-[#1c2333] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          hpA > 50 ? "bg-green-500" : hpA > 20 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${hpA}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="mt-2">
                  <span className="text-3xl font-black text-[#4ade80]">{pA}¢</span>
                </div>
              </div>

              {/* VS */}
              <div className="shrink-0 mx-4 text-center">
                <div className="w-14 h-14 rounded-full border-2 border-[#1c2333] bg-[#0d1117] flex items-center justify-center mb-2">
                  <span className="text-lg font-black text-gray-600">VS</span>
                </div>
                {fight.status === "finished" && (
                  <span className="text-[10px] font-bold text-green-400">{fight.method}</span>
                )}
              </div>

              {/* Fighter B */}
              <div className="text-center flex-1">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center text-3xl mx-auto mb-2">
                  🥊
                </div>
                <h2 className="font-black text-lg md:text-xl">{fight.fighterB.name}</h2>
                <p className="text-xs text-gray-500">&quot;{fight.fighterB.nickname}&quot; • {fight.fighterB.style}</p>
                {fight.fighterB.wins !== undefined && (
                  <p className="text-[10px] text-gray-600 mt-1">
                    {fight.fighterB.wins}W-{fight.fighterB.losses}L
                    {(fight.fighterB.streak ?? 0) > 0 && <span className="text-orange-400 ml-1">🔥W{fight.fighterB.streak}</span>}
                  </p>
                )}
                {rounds.length > 0 && (
                  <div className="mt-2 max-w-[140px] mx-auto">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-blue-400">HP</span>
                      <span className={hpB > 50 ? "text-green-400" : hpB > 20 ? "text-yellow-400" : "text-red-400"}>{Math.round(hpB)}%</span>
                    </div>
                    <div className="h-2.5 bg-[#1c2333] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          hpB > 50 ? "bg-green-500" : hpB > 20 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${hpB}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="mt-2">
                  <span className="text-3xl font-black text-[#4ade80]">{pB}¢</span>
                </div>
              </div>
            </div>

            {/* Live odds bar */}
            <div className="mt-4 max-w-md mx-auto">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-400 font-semibold">{fight.fighterA.name} {pA}%</span>
                <span className="text-blue-400 font-semibold">{fight.fighterB.name} {pB}%</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                <div className="bg-red-500/50 rounded-l-full transition-all duration-500" style={{ width: `${pA}%` }} />
                <div className="bg-blue-500/50 rounded-r-full transition-all duration-500" style={{ width: `${pB}%` }} />
              </div>
              <div className="text-center mt-2 text-xs text-gray-500">
                ${totalVol.toLocaleString()} Vol. • {liveOdds?.totalBets ?? fight.bets.length} bets
              </div>
            </div>

            {/* Action buttons */}
            {fight.status === "upcoming" && (
              <div className="flex gap-3 mt-5 max-w-md mx-auto">
                <button onClick={() => { setBetSide("A"); setShowBetPanel(true); }}
                  className="flex-1 py-2.5 bg-[#0e4429] hover:bg-[#196c3a] text-[#4ade80] font-bold rounded-xl transition text-sm">
                  {fight.fighterA.name} {pA}¢
                </button>
                <button onClick={simulate} disabled={simulating}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 rounded-xl font-bold text-sm transition disabled:opacity-50 shrink-0">
                  {simulating ? "⚡..." : "▶ Fight"}
                </button>
                <button onClick={() => { setBetSide("B"); setShowBetPanel(true); }}
                  className="flex-1 py-2.5 bg-[#1a1a3e] hover:bg-[#25255e] text-[#818cf8] font-bold rounded-xl transition text-sm">
                  {fight.fighterB.name} {pB}¢
                </button>
              </div>
            )}

            {fight.status === "finished" && fight.winnerId && (
              <div className="text-center mt-4 py-3 bg-green-500/5 border border-green-500/20 rounded-xl max-w-md mx-auto">
                <span className="text-lg font-black text-green-400">
                  🏆 {fight.winnerId === fight.fighterA.id ? fight.fighterA.name : fight.fighterB.name} wins by {fight.method}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ TABS ═══════ */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition ${
                activeTab === tab.key
                  ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"
                  : "bg-[#161b22] text-gray-500 border border-[#1c2333] hover:text-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ═══════ LEFT CONTENT ═══════ */}
          <div className="lg:col-span-2 space-y-6">
            {/* ARENA TAB */}
            {activeTab === "arena" && (
              <>
                {/* AI Fight Video */}
                {fight.status === "finished" && (
                  <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">AI Fight Video</h3>
                      {videoState && (
                        <span className="text-[10px] text-gray-600">provider: {videoState.provider}</span>
                      )}
                    </div>
                    {videoState?.status === "ready" && videoState.videoUrl ? (
                      <video src={videoState.videoUrl} controls className="w-full rounded-xl bg-black" />
                    ) : videoState?.status === "queued" || videoState?.status === "processing" ? (
                      <div className="py-8 text-center text-sm text-gray-500">
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse mr-2" />
                        Generating video ({videoState.status})... this can take a few minutes.
                      </div>
                    ) : videoState?.status === "failed" ? (
                      <div className="py-4 text-center text-sm text-red-400">
                        Generation failed: {videoState.error}
                        <button onClick={requestVideo} disabled={videoRequesting} className="block mx-auto mt-3 text-xs text-orange-400 hover:text-orange-300 font-semibold">
                          Retry
                        </button>
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <p className="text-xs text-gray-500 mb-3">
                          {videoState?.providerConfigured
                            ? "Generate an AI video render of this fight from the deterministic event log."
                            : "No video provider configured (set RUNWAY_API_KEY). Video generation will report \"unavailable\" until a real key is added — no fake footage is shown."}
                        </p>
                        <button onClick={requestVideo} disabled={videoRequesting}
                          className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 rounded-xl font-bold text-xs transition disabled:opacity-50">
                          {videoRequesting ? "Requesting..." : "🎬 Generate AI Video"}
                        </button>
                        {videoState?.error && <p className="text-[10px] text-gray-600 mt-2">{videoState.error}</p>}
                      </div>
                    )}
                  </div>
                )}

                {/* Stats comparison */}
                <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Tale of the Tape</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                    <div className="text-red-400 font-semibold">{fight.fighterA.name}</div>
                    <div className="text-gray-600">VS</div>
                    <div className="text-blue-400 font-semibold">{fight.fighterB.name}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4 border-b border-[#1c2333] pb-4">
                    {[
                      { label: "Weight", a: `${fight.fighterA.weight}kg`, b: `${fight.fighterB.weight}kg` },
                      { label: "Height", a: `${fight.fighterA.height}cm`, b: `${fight.fighterB.height}cm` },
                      { label: "Reach", a: `${fight.fighterA.reach}cm`, b: `${fight.fighterB.reach}cm` },
                    ].map(s => (
                      <div key={s.label} className="contents">
                        <div className="text-white font-semibold">{s.a}</div>
                        <div className="text-gray-600">{s.label}</div>
                        <div className="text-white font-semibold">{s.b}</div>
                      </div>
                    ))}
                  </div>
                  <StatBar label="Striking" valA={fight.fighterA.striking} valB={fight.fighterB.striking} />
                  <StatBar label="Grappling" valA={fight.fighterA.grappling} valB={fight.fighterB.grappling} />
                  <StatBar label="Cardio" valA={fight.fighterA.cardio} valB={fight.fighterB.cardio} />
                  <StatBar label="Chin" valA={fight.fighterA.chin} valB={fight.fighterB.chin} />
                  <StatBar label="Speed" valA={fight.fighterA.speed} valB={fight.fighterB.speed} />
                  <StatBar label="Overall" valA={fight.fighterA.rating} valB={fight.fighterB.rating} />
                </div>

                {/* Round by round with playback */}
                {rounds.length > 0 && (
                  <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Fight Transcript</h3>
                      {!isPlaying && playbackIndex < 0 && (
                        <button onClick={startPlayback} className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition">
                          ▶ Replay
                        </button>
                      )}
                      {isPlaying && (
                        <button onClick={() => { setIsPlaying(false); setPlaybackIndex(rounds.length); }} className="text-xs text-gray-500 hover:text-gray-300 transition">
                          ⏭ Skip
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {rounds.map((round, ri) => {
                        const visible = playbackIndex < 0 || ri <= playbackIndex;
                        if (!visible) return null;
                        const isCurrentRound = isPlaying && ri === playbackIndex;
                        return (
                          <div key={round.round} className={`bg-[#0d1117] rounded-xl p-4 border transition-all duration-300 ${
                            isCurrentRound ? "border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]" : "border-[#1c2333]"
                          }`}>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">Round {round.round}</span>
                                {isCurrentRound && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-red-400 font-semibold">{round.scoreA}</span>
                                <span className="text-gray-600">-</span>
                                <span className="text-blue-400 font-semibold">{round.scoreB}</span>
                              </div>
                            </div>
                            <ul className="text-sm text-gray-400 space-y-1">
                              {round.events.map((e, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-gray-700 text-xs mt-0.5 shrink-0 w-10 text-right font-mono">
                                    {String(Math.floor((i * 17 + round.round * 31) % 300 / 60)).padStart(2, "0")}:{String((i * 17 + round.round * 31) % 60).padStart(2, "0")}
                                  </span>
                                  <span>{e}</span>
                                </li>
                              ))}
                            </ul>
                            {round.finish && (
                              <div className="mt-2 p-2 bg-yellow-500/10 rounded-lg text-center">
                                <span className="text-sm font-bold text-yellow-400">
                                  🔔 {round.finish.method} — Fighter {round.finish.winner} wins!
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Odds History Chart */}
                {oddsHistory.length > 1 && (
                  <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Odds History</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{fight.fighterA.name}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{fight.fighterB.name}</span>
                    </div>
                    <OddsChart history={oddsHistory} />
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center text-[10px] text-gray-600">
                      <div>Opening: {oddsHistory[0].oddsA.toFixed(2)} / {oddsHistory[0].oddsB.toFixed(2)}</div>
                      <div>Snapshots: {oddsHistory.length}</div>
                      <div>Current: {oddsHistory[oddsHistory.length - 1].oddsA.toFixed(2)} / {oddsHistory[oddsHistory.length - 1].oddsB.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* MARKETS TAB */}
            {activeTab === "markets" && (
              <div className="space-y-4">
                {markets.length === 0 ? (
                  <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6 text-center text-gray-600">
                    <p className="text-sm">No markets available for this fight</p>
                  </div>
                ) : (
                  markets.map(market => {
                    const totalPool = Object.values(market.bets).reduce((s, b) => s + b.total, 0);
                    return (
                      <div key={market.id} className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm">{market.question}</h3>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            market.status === "open" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"
                          }`}>
                            {market.status === "open" ? "Open" : "Resolved"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {market.options.map(option => {
                            const betData = market.bets[option] || { total: 0, count: 0 };
                            const pct = totalPool > 0 ? Math.round((betData.total / totalPool) * 100) : Math.round(100 / market.options.length);
                            const isWinner = market.result === option;
                            return (
                              <div key={option} className={`flex items-center justify-between p-3 rounded-xl border transition ${
                                isWinner ? "border-green-500/30 bg-green-500/5" : "border-[#1c2333] bg-[#0d1117] hover:border-[#2d3748]"
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{option}</span>
                                  {isWinner && <span className="text-[10px] text-green-400">✓</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{betData.count} bets</span>
                                  <span className="text-sm font-bold text-[#4ade80]">{pct}¢</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {totalPool > 0 && (
                          <p className="text-[10px] text-gray-600 mt-2">${totalPool.toLocaleString()} total pool</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === "activity" && (
              <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
                <h3 className="font-bold mb-3 text-sm">Bet Flow</h3>
                {fight.bets.length === 0 ? (
                  <p className="text-xs text-gray-600">No bets placed yet</p>
                ) : (
                  <div className="space-y-1">
                    {[...fight.bets].reverse().map((bet) => (
                      <div key={bet.id} className="flex items-center justify-between text-xs bg-[#0d1117] rounded-lg p-3 border border-[#1c2333] font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 text-[10px]">
                            {bet.created_at ? new Date(bet.created_at).toLocaleTimeString() : "—"}
                          </span>
                          <span className="text-gray-500">{bet.wallet.slice(0, 6)}...{bet.wallet.slice(-4)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">${bet.amount}</span>
                          <span className="text-gray-600">→</span>
                          <span className={bet.side === "A" ? "text-red-400" : "text-blue-400"}>
                            {bet.side === "A" ? fight.fighterA.name : fight.fighterB.name}
                          </span>
                        </div>
                        <div>
                          {bet.status === "won" && <span className="text-green-400">+${bet.payout?.toFixed(0)}</span>}
                          {bet.status === "lost" && <span className="text-red-400">-${bet.amount}</span>}
                          {bet.status === "pending" && <span className="text-gray-600">pending</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VERIFY TAB */}
            {activeTab === "verify" && (
              <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  Provably Fair
                </h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="bg-[#0d1117] rounded-xl p-4 border border-[#1c2333]">
                    <p className="text-gray-500 mb-1.5">Seed Hash (published before fight)</p>
                    <p className="text-gray-300 break-all text-[11px]">{fight.seedHash}</p>
                  </div>
                  {fight.status === "finished" && fight.serverSeed ? (
                    <>
                      <div className="bg-[#0d1117] rounded-xl p-4 border border-[#1c2333]">
                        <p className="text-gray-500 mb-1.5">Server Seed (revealed after fight)</p>
                        <p className="text-gray-300 break-all text-[11px]">{fight.serverSeed}</p>
                      </div>
                      <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/20">
                        <p className="text-green-400 font-semibold mb-1">✅ Verification Available</p>
                        <p className="text-gray-500 text-[10px]">
                          SHA256(server_seed) should equal the seed hash. The fight result is computed from HMAC(server_seed, client_seed:nonce).
                        </p>
                      </div>
                      <Link href="/verify" className="block text-center py-2 text-[#4ade80] hover:text-[#22c55e] text-xs font-semibold transition">
                        Open Full Verification Tool →
                      </Link>
                    </>
                  ) : (
                    <div className="bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/20">
                      <p className="text-yellow-400 font-semibold mb-1">🔒 Server seed hidden</p>
                      <p className="text-gray-500 text-[10px]">
                        The server seed will be revealed after the fight is settled, allowing you to verify the result was fair.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══════ RIGHT SIDEBAR ═══════ */}
          <div className="space-y-6">
            {/* Bet panel */}
            {fight.status === "upcoming" && (
              <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5 sticky top-20">
                <h3 className="font-bold mb-4">Place Trade</h3>
                <div className="flex rounded-lg overflow-hidden mb-4 border border-[#1c2333]">
                  <button onClick={() => setBetSide("A")}
                    className={`flex-1 py-2.5 text-sm font-semibold transition ${
                      betSide === "A" ? "bg-[#0e4429] text-[#4ade80]" : "bg-[#0d1117] text-gray-500 hover:text-gray-300"
                    }`}>
                    {fight.fighterA.name} {pA}¢
                  </button>
                  <button onClick={() => setBetSide("B")}
                    className={`flex-1 py-2.5 text-sm font-semibold transition ${
                      betSide === "B" ? "bg-[#1a1a3e] text-[#818cf8]" : "bg-[#0d1117] text-gray-500 hover:text-gray-300"
                    }`}>
                    {fight.fighterB.name} {pB}¢
                  </button>
                </div>

                <label className="block text-xs text-gray-500 mb-1">Amount (USDT)</label>
                <input type="number" placeholder="100" value={betAmount} onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm mb-2 focus:outline-none focus:border-[#4ade80]/50" />

                {betAmount && (
                  <div className="text-xs text-gray-500 mb-3 space-y-1">
                    <div className="flex justify-between"><span>Avg price</span><span>{betSide === "A" ? pA : pB}¢</span></div>
                    <div className="flex justify-between"><span>Shares</span><span>{((parseFloat(betAmount) || 0) / ((betSide === "A" ? pA : pB) / 100)).toFixed(1)}</span></div>
                    <div className="flex justify-between text-[#4ade80] font-semibold">
                      <span>Potential return</span>
                      <span>${((parseFloat(betAmount) || 0) * (betSide === "A" ? fight.oddsA : fight.oddsB)).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <label className="block text-xs text-gray-500 mb-1">Wallet</label>
                <input type="text" placeholder="0x..." value={wallet} onChange={(e) => setWallet(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm mb-4 focus:outline-none focus:border-[#4ade80]/50" />

                <button onClick={placeBet} disabled={txPending}
                  className="w-full py-3 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold rounded-xl text-sm transition disabled:opacity-50">
                  {txPending ? "⏳ Signing tx..." : onChain ? "🔗 Sign & Bet On-Chain" : "Buy Yes"}
                </button>

                {txHash && (
                  <div className="mt-2 p-2 bg-green-500/10 rounded-lg text-xs text-green-400 break-all">
                    ✅ Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </div>
                )}
                {txError && (
                  <div className="mt-2 p-2 bg-red-500/10 rounded-lg text-xs text-red-400">❌ {txError}</div>
                )}
              </div>
            )}

            {/* Fight info card */}
            <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
              <h3 className="font-bold mb-3 text-sm">Fight Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400"><span>Rounds</span><span className="text-white">3</span></div>
                <div className="flex justify-between text-gray-400"><span>Total volume</span><span className="text-white">${totalVol.toLocaleString()}</span></div>
                <div className="flex justify-between text-gray-400"><span>Bets placed</span><span className="text-white">{liveOdds?.totalBets ?? fight.bets.length}</span></div>
                <div className="flex justify-between text-gray-400"><span>Markets</span><span className="text-white">{markets.length}</span></div>
                <div className="flex justify-between text-gray-400"><span>Verification</span><span className="text-[#4ade80]">Provably Fair</span></div>
              </div>
            </div>

            <FightChat fightId={id} wallet={wallet} />

            {/* Quick activity */}
            <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-5">
              <h3 className="font-bold mb-3 text-sm">Recent Bets</h3>
              {fight.bets.length === 0 ? (
                <p className="text-xs text-gray-600">No bets yet</p>
              ) : (
                <div className="space-y-1.5">
                  {fight.bets.slice(-5).reverse().map(bet => (
                    <div key={bet.id} className="flex items-center justify-between text-[10px] bg-[#0d1117] rounded-lg p-2 border border-[#1c2333]">
                      <span className="text-gray-500">{bet.wallet.slice(0, 6)}...{bet.wallet.slice(-4)}</span>
                      <span className={bet.side === "A" ? "text-red-400" : "text-blue-400"}>
                        ${bet.amount} → {bet.side === "A" ? fight.fighterA.name : fight.fighterB.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile bet panel */}
      {showBetPanel && fight.status === "upcoming" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 lg:hidden" onClick={() => setShowBetPanel(false)}>
          <div className="bg-[#161b22] rounded-t-2xl w-full max-w-lg p-5 border-t border-[#1c2333]" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
            <h3 className="font-bold mb-3">Buy {betSide === "A" ? fight.fighterA.name : fight.fighterB.name}</h3>
            <input type="number" placeholder="Amount (USDT)" value={betAmount} onChange={(e) => setBetAmount(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm mb-3 focus:outline-none" />
            <input type="text" placeholder="Wallet 0x..." value={wallet} onChange={(e) => setWallet(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm mb-4 focus:outline-none" />
            <button onClick={placeBet} disabled={txPending}
              className="w-full py-3 bg-[#4ade80] text-black font-bold rounded-xl transition disabled:opacity-50">
              {txPending ? "⏳ Signing tx..." : onChain ? "🔗 Sign & Bet On-Chain" : "Confirm Trade"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
