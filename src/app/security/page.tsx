"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Alert {
  time: string;
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  status: "investigating" | "resolved" | "false-positive";
}

interface SecurityData {
  integrityScore: number;
  flaggedAccounts: number;
  unusualPatterns: number;
  manipulationBlocked: number;
  alerts: Alert[];
  perFightHealth: Record<string, { suspicious: boolean; alerts: number }>;
}

function GaugeSVG({ score }: { score: number }) {
  const angle = (score / 100) * 180;
  const rad = ((180 - angle) * Math.PI) / 180;
  const x = 100 + 70 * Math.cos(rad);
  const y = 100 - 70 * Math.sin(rad);
  const color =
    score >= 80 ? "#4ade80" : score >= 50 ? "#facc15" : "#ef4444";
  const largeArc = angle > 180 ? 1 : 0;

  return (
    <svg viewBox="0 0 200 120" className="w-48 mx-auto">
      <path
        d="M 30 100 A 70 70 0 0 1 170 100"
        fill="none"
        stroke="#1c2333"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d={`M 30 100 A 70 70 0 ${largeArc} 1 ${x.toFixed(1)} ${(100 - (100 - y)).toFixed(1)}`}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <text
        x="100"
        y="90"
        textAnchor="middle"
        fill={color}
        fontSize="28"
        fontWeight="900"
      >
        {score}
      </text>
      <text
        x="100"
        y="110"
        textAnchor="middle"
        fill="#6b7280"
        fontSize="10"
      >
        Integrity Score
      </text>
    </svg>
  );
}

const detectionRules = [
  {
    name: "Wash Trading Detection",
    desc: "Flags wallets betting on both sides of the same fight to guarantee profit regardless of outcome.",
    icon: "🔄",
  },
  {
    name: "Sudden Large Bets",
    desc: "Alerts when bets exceed 3x the platform average, especially close to fight time.",
    icon: "📈",
  },
  {
    name: "Coordinated Betting Patterns",
    desc: "Detects multiple wallets placing similar bets within a short time window.",
    icon: "🕸",
  },
  {
    name: "Odds Manipulation Attempts",
    desc: "Monitors for patterns designed to artificially move odds lines before placing counter bets.",
    icon: "⚖",
  },
];

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/security")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const severityColor = {
    low: "text-blue-400 bg-blue-500/10",
    medium: "text-yellow-400 bg-yellow-500/10",
    high: "text-red-400 bg-red-500/10",
  };

  const statusColor = {
    investigating: "text-yellow-400",
    resolved: "text-[#4ade80]",
    "false-positive": "text-gray-500",
  };

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
          <span className="text-sm text-gray-400">
            Market Integrity & Anti-Manipulation
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black mb-2">
            Market Integrity & Anti-Manipulation
          </h1>
          <p className="text-gray-500 text-sm">
            Real-time monitoring of platform health and suspicious activity
          </p>
        </div>

        {loading ? (
          <p className="text-gray-600 text-center py-10">Loading...</p>
        ) : data ? (
          <>
            {/* Dashboard Metrics */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 bg-[#161b22] rounded-xl border border-[#1c2333] p-6 flex items-center justify-center">
                <GaugeSVG score={data.integrityScore} />
              </div>
              {[
                {
                  label: "Flagged Accounts",
                  value: data.flaggedAccounts,
                  color:
                    data.flaggedAccounts > 0
                      ? "text-red-400"
                      : "text-[#4ade80]",
                },
                {
                  label: "Unusual Patterns",
                  value: data.unusualPatterns,
                  color:
                    data.unusualPatterns > 0
                      ? "text-yellow-400"
                      : "text-[#4ade80]",
                },
                {
                  label: "Manipulation Blocked",
                  value: data.manipulationBlocked,
                  color:
                    data.manipulationBlocked > 0
                      ? "text-orange-400"
                      : "text-[#4ade80]",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-[#161b22] rounded-xl border border-[#1c2333] p-5"
                >
                  <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                  <p className={`text-3xl font-black ${m.color}`}>
                    {m.value}
                  </p>
                </div>
              ))}
            </section>

            {/* Detection Rules */}
            <section>
              <h2 className="text-lg font-bold mb-3">Detection Rules</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {detectionRules.map((rule) => (
                  <div
                    key={rule.name}
                    className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 flex gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#0d1117] flex items-center justify-center text-lg shrink-0">
                      {rule.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{rule.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {rule.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Alerts Table */}
            <section>
              <h2 className="text-lg font-bold mb-3">Recent Alerts</h2>
              <div className="bg-[#161b22] rounded-xl border border-[#1c2333] overflow-hidden">
                {data.alerts.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[#4ade80] font-bold text-lg mb-1">
                      All Clear
                    </p>
                    <p className="text-gray-600 text-sm">
                      No suspicious activity detected
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1c2333] text-gray-500 text-xs">
                          <th className="text-left p-3 font-medium">Time</th>
                          <th className="text-left p-3 font-medium">Type</th>
                          <th className="text-left p-3 font-medium">
                            Severity
                          </th>
                          <th className="text-left p-3 font-medium">
                            Description
                          </th>
                          <th className="text-left p-3 font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.alerts.map((alert, i) => (
                          <tr
                            key={i}
                            className="border-b border-[#1c2333]/50 hover:bg-[#0d1117]/50"
                          >
                            <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(alert.time).toLocaleTimeString()}
                            </td>
                            <td className="p-3 text-xs font-medium">
                              {alert.type}
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  severityColor[alert.severity]
                                }`}
                              >
                                {alert.severity}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-gray-400 max-w-xs truncate">
                              {alert.description}
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-xs font-medium ${
                                  statusColor[alert.status]
                                }`}
                              >
                                {alert.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Per-Fight Health */}
            {Object.keys(data.perFightHealth).length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3">Market Health by Fight</h2>
                <div className="space-y-2">
                  {Object.entries(data.perFightHealth).map(
                    ([fightId, health]) => (
                      <div
                        key={fightId}
                        className={`bg-[#161b22] rounded-xl border p-4 flex items-center justify-between ${
                          health.suspicious
                            ? "border-red-500/30"
                            : "border-[#1c2333]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              health.suspicious
                                ? "bg-red-500"
                                : "bg-[#4ade80]"
                            }`}
                          />
                          <span className="text-sm font-mono text-gray-400">
                            {fightId.slice(0, 12)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {health.suspicious ? (
                            <span className="text-xs text-red-400 font-bold">
                              {health.alerts} alert
                              {health.alerts !== 1 && "s"}
                            </span>
                          ) : (
                            <span className="text-xs text-[#4ade80]">
                              Clean
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}
          </>
        ) : (
          <p className="text-red-400 text-center py-10">
            Failed to load security data
          </p>
        )}
      </main>
    </div>
  );
}
