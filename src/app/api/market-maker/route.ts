import { NextResponse } from "next/server";

// In-memory bot state (demo)
let botConfig = {
  active: false,
  spread: 2.5,
  maxExposure: 5000,
  rebalanceThreshold: 15,
};

const botStats = {
  totalVolumeProvided: 42850,
  feesEarned: 856.12,
  netPnL: 324.67,
  uptimeHours: 168,
  tradesExecuted: 312,
  avgSpread: 2.3,
};

const positions = [
  { fight: "Silva vs. Johnson", side: "A", amount: 500, entryOdds: 1.85, currentOdds: 1.92, pnl: -18.92 },
  { fight: "Silva vs. Johnson", side: "B", amount: 480, entryOdds: 2.05, currentOdds: 1.98, pnl: 16.32 },
  { fight: "Martinez vs. Lee", side: "A", amount: 320, entryOdds: 2.10, currentOdds: 2.15, pnl: -7.62 },
  { fight: "Martinez vs. Lee", side: "B", amount: 340, entryOdds: 1.78, currentOdds: 1.74, pnl: 7.65 },
  { fight: "Thompson vs. Diaz", side: "A", amount: 250, entryOdds: 1.65, currentOdds: 1.70, pnl: -7.58 },
  { fight: "Thompson vs. Diaz", side: "B", amount: 260, entryOdds: 2.35, currentOdds: 2.28, pnl: 7.72 },
];

function generateActivityLog() {
  const actions = [
    "Placed BUY order: $150 on Fighter A @ 1.92",
    "Placed BUY order: $145 on Fighter B @ 2.08",
    "Rebalanced: shifted $50 from A to B",
    "Spread widened to 3.1% (volatility detected)",
    "Placed BUY order: $200 on Fighter A @ 1.88",
    "Placed BUY order: $195 on Fighter B @ 2.12",
    "Cancelled stale order: $100 on Fighter B @ 2.25",
    "Spread tightened to 2.2% (stable market)",
    "Placed BUY order: $175 on Fighter A @ 1.95",
    "Rebalanced: shifted $75 from B to A",
  ];
  const now = Date.now();
  return actions.map((action, i) => ({
    time: new Date(now - i * 180000).toISOString(),
    action,
    type: action.includes("Rebalanced") ? "rebalance" : action.includes("Cancelled") ? "cancel" : action.includes("Spread") ? "config" : "order",
  }));
}

export async function GET() {
  return NextResponse.json({
    config: botConfig,
    stats: botStats,
    positions,
    activityLog: generateActivityLog(),
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.spread !== undefined) botConfig.spread = body.spread;
  if (body.maxExposure !== undefined) botConfig.maxExposure = body.maxExposure;
  if (body.active !== undefined) botConfig.active = body.active;
  if (body.rebalanceThreshold !== undefined) botConfig.rebalanceThreshold = body.rebalanceThreshold;

  return NextResponse.json({ config: botConfig, message: "Settings updated" });
}
