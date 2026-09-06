"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const WALLET = "0xABC123";

const quizQuestions = [
  {
    q: "How often do you bet more than you planned?",
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
  },
  {
    q: "Do you chase losses by placing more bets?",
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
  },
  {
    q: "Have you borrowed money to place bets?",
    options: ["Never", "Once", "A few times", "Regularly", "Always"],
  },
  {
    q: "Do you feel anxious when not betting?",
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
  },
  {
    q: "Has betting affected your relationships or work?",
    options: ["Never", "Slightly", "Moderately", "Significantly", "Severely"],
  },
];

const sessionOptions = ["1h", "2h", "4h", "8h", "unlimited"];
const cooldownOptions = ["none", "15min", "30min", "1h"];
const exclusionOptions = ["24h", "7d", "30d", "permanent"];

interface Stats {
  todayDeposits: number;
  todayLosses: number;
  betsLastHour: number;
  totalBetsToday: number;
}

interface Limits {
  daily_deposit: number;
  daily_loss: number;
  max_bet: number;
  session_limit: string;
  cooldown: string;
  self_exclusion_until: string | null;
}

export default function ResponsibleGamblingPage() {
  const [limits, setLimits] = useState<Limits>({
    daily_deposit: 500,
    daily_loss: 250,
    max_bet: 250,
    session_limit: "unlimited",
    cooldown: "none",
    self_exclusion_until: null,
  });
  const [stats, setStats] = useState<Stats>({
    todayDeposits: 0,
    todayLosses: 0,
    betsLastHour: 0,
    totalBetsToday: 0,
  });
  const [quizAnswers, setQuizAnswers] = useState<number[]>(Array(5).fill(-1));
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showExclusionModal, setShowExclusionModal] = useState(false);
  const [selectedExclusion, setSelectedExclusion] = useState("24h");
  const [saving, setSaving] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);

  useEffect(() => {
    fetch(`/api/responsible?wallet=${WALLET}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.limits) setLimits(data.limits);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setSessionMinutes(Math.floor((Date.now() - startedAt) / 60000));
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const saveSettings = async (extra?: Record<string, unknown>) => {
    setSaving(true);
    await fetch("/api/responsible", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: WALLET,
        dailyDeposit: limits.daily_deposit,
        dailyLoss: limits.daily_loss,
        maxBet: limits.max_bet,
        sessionLimit: limits.session_limit,
        cooldown: limits.cooldown,
        ...extra,
      }),
    });
    setSaving(false);
  };

  const quizScore = quizAnswers.reduce((s, a) => s + (a >= 0 ? a : 0), 0);
  const maxScore = quizQuestions.length * 4;
  const riskLevel =
    quizScore <= 4 ? "Low" : quizScore <= 10 ? "Moderate" : quizScore <= 15 ? "High" : "Very High";
  const riskColor =
    quizScore <= 4
      ? "text-[#4ade80]"
      : quizScore <= 10
      ? "text-yellow-400"
      : quizScore <= 15
      ? "text-orange-400"
      : "text-red-400";

  const depositPct = limits.daily_deposit > 0 ? (stats.todayDeposits / limits.daily_deposit) * 100 : 0;
  const lossPct = limits.daily_loss > 0 ? (stats.todayLosses / limits.daily_loss) * 100 : 0;

  function warningLevel(pct: number) {
    if (pct >= 100) return "bg-red-500/20 border-red-500/40 text-red-400";
    if (pct >= 75) return "bg-orange-500/20 border-orange-500/40 text-orange-400";
    return "bg-[#161b22] border-[#1c2333] text-gray-300";
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>
              All<span className="text-[#4ade80]">Fights</span>
            </span>
          </Link>
          <span className="text-gray-600">&#8250;</span>
          <span className="text-sm text-gray-400">Responsible Gambling</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black mb-2">Responsible Gambling</h1>
          <p className="text-gray-500 text-sm">
            Manage your limits and stay in control. Wallet:{" "}
            <span className="text-[#4ade80] font-mono">{WALLET}</span>
          </p>
        </div>

        {/* Current Stats */}
        <section>
          <h2 className="text-lg font-bold mb-3">Current Session Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Today's Deposits",
                value: `$${stats.todayDeposits.toFixed(2)}`,
                pct: depositPct,
              },
              {
                label: "Today's Losses",
                value: `$${stats.todayLosses.toFixed(2)}`,
                pct: lossPct,
              },
              {
                label: "Session Time",
                value: `${sessionMinutes}m`,
                pct: 0,
              },
              {
                label: "Bets Last Hour",
                value: `${stats.betsLastHour}`,
                pct: 0,
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border p-4 ${warningLevel(s.pct)}`}
              >
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-xl font-black">{s.value}</p>
                {s.pct > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          s.pct >= 100
                            ? "bg-red-500"
                            : s.pct >= 75
                            ? "bg-orange-400"
                            : "bg-[#4ade80]"
                        }`}
                        style={{ width: `${Math.min(s.pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] mt-1 text-gray-600">
                      {s.pct.toFixed(0)}% of limit
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Settings Panel */}
        <section>
          <h2 className="text-lg font-bold mb-3">Betting Limits</h2>
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6 space-y-6">
            {/* Sliders */}
            {[
              {
                label: "Daily Deposit Limit",
                key: "daily_deposit" as const,
                max: 1000,
              },
              {
                label: "Daily Loss Limit",
                key: "daily_loss" as const,
                max: 500,
              },
              {
                label: "Max Single Bet",
                key: "max_bet" as const,
                max: 500,
              },
            ].map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">{s.label}</span>
                  <span className="text-[#4ade80] font-bold">
                    ${limits[s.key].toFixed(0)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={s.max}
                  step={10}
                  value={limits[s.key]}
                  onChange={(e) =>
                    setLimits({ ...limits, [s.key]: Number(e.target.value) })
                  }
                  className="w-full accent-[#4ade80] h-2 bg-[#0d1117] rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>$0</span>
                  <span>${s.max}</span>
                </div>
              </div>
            ))}

            {/* Session Time */}
            <div>
              <p className="text-sm text-gray-400 mb-2">Session Time Limit</p>
              <div className="flex gap-2 flex-wrap">
                {sessionOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() =>
                      setLimits({ ...limits, session_limit: opt })
                    }
                    className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                      limits.session_limit === opt
                        ? "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20"
                        : "bg-[#0d1117] text-gray-500 border-[#1c2333] hover:text-gray-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Cooldown */}
            <div>
              <p className="text-sm text-gray-400 mb-2">
                Cool-down Period After Losses
              </p>
              <div className="flex gap-2 flex-wrap">
                {cooldownOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setLimits({ ...limits, cooldown: opt })}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                      limits.cooldown === opt
                        ? "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20"
                        : "bg-[#0d1117] text-gray-500 border-[#1c2333] hover:text-gray-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => saveSettings()}
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-[#4ade80] text-black font-bold text-sm hover:bg-[#22c55e] transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </section>

        {/* Self-Exclusion */}
        <section>
          <h2 className="text-lg font-bold mb-3">Self-Exclusion</h2>
          <div className="bg-[#161b22] rounded-xl border border-red-500/20 p-6">
            <p className="text-sm text-gray-400 mb-4">
              Take a break from betting. During self-exclusion, you will not be
              able to place any bets.
            </p>
            {limits.self_exclusion_until &&
            new Date(limits.self_exclusion_until) > new Date() ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 font-bold text-sm">
                  Self-exclusion active until{" "}
                  {new Date(limits.self_exclusion_until).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowExclusionModal(true)}
                className="px-6 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 font-bold text-sm hover:bg-red-500/20 transition"
              >
                Activate Self-Exclusion
              </button>
            )}
          </div>
        </section>

        {/* Exclusion Modal */}
        {showExclusionModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#161b22] border border-[#1c2333] rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-black mb-2">Confirm Self-Exclusion</h3>
              <p className="text-sm text-gray-400 mb-4">
                You will not be able to place bets during this period. This
                action cannot be undone early.
              </p>
              <div className="flex gap-2 mb-6 flex-wrap">
                {exclusionOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedExclusion(opt)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                      selectedExclusion === opt
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-[#0d1117] text-gray-500 border-[#1c2333]"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExclusionModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-[#0d1117] text-gray-400 border border-[#1c2333] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await saveSettings({ selfExclusion: selectedExclusion });
                    setShowExclusionModal(false);
                    window.location.reload();
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition"
                >
                  Confirm Exclusion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Self-Assessment Quiz */}
        <section>
          <h2 className="text-lg font-bold mb-3">Self-Assessment Quiz</h2>
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6 space-y-5">
            {quizQuestions.map((q, qi) => (
              <div key={qi}>
                <p className="text-sm font-medium mb-2">
                  {qi + 1}. {q.q}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => {
                        const next = [...quizAnswers];
                        next[qi] = oi;
                        setQuizAnswers(next);
                      }}
                      className={`px-3 py-1 text-xs rounded-lg border transition ${
                        quizAnswers[qi] === oi
                          ? "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20"
                          : "bg-[#0d1117] text-gray-500 border-[#1c2333] hover:text-gray-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={() => setQuizSubmitted(true)}
              disabled={quizAnswers.some((a) => a < 0)}
              className="w-full py-2.5 rounded-lg bg-[#4ade80] text-black font-bold text-sm hover:bg-[#22c55e] transition disabled:opacity-30"
            >
              Get Results
            </button>

            {quizSubmitted && (
              <div className="bg-[#0d1117] rounded-xl border border-[#1c2333] p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Risk Level:</span>
                  <span className={`font-black text-lg ${riskColor}`}>
                    {riskLevel}
                  </span>
                </div>
                <div className="h-2 bg-[#1c2333] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      quizScore <= 4
                        ? "bg-[#4ade80]"
                        : quizScore <= 10
                        ? "bg-yellow-400"
                        : quizScore <= 15
                        ? "bg-orange-400"
                        : "bg-red-500"
                    }`}
                    style={{
                      width: `${(quizScore / maxScore) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Score: {quizScore}/{maxScore}
                </p>
                {quizScore > 10 && (
                  <p className="text-xs text-orange-400 mt-2">
                    Your answers suggest you may be at risk. Consider setting
                    stricter limits or taking a break.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Resources */}
        <section>
          <h2 className="text-lg font-bold mb-3">Help & Resources</h2>
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6 space-y-3">
            {[
              {
                name: "National Council on Problem Gambling",
                info: "1-800-522-4700 | ncpgambling.org",
              },
              {
                name: "Gamblers Anonymous",
                info: "gamblersanonymous.org",
              },
              {
                name: "National Problem Gambling Helpline",
                info: "Call or text 1-800-522-4700, 24/7",
              },
              {
                name: "GamTalk",
                info: "Online peer support forum at gamtalk.org",
              },
            ].map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#1c2333]"
              >
                <div className="w-8 h-8 rounded-full bg-[#4ade80]/10 flex items-center justify-center text-[#4ade80] text-sm shrink-0">
                  ?
                </div>
                <div>
                  <p className="text-sm font-bold">{r.name}</p>
                  <p className="text-xs text-gray-500">{r.info}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
