import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface Bet {
  id: string;
  fight_id: string;
  wallet: string;
  amount: number;
  side: string;
  odds: number;
  status: string;
  created_at: string;
}

interface Alert {
  time: string;
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  status: "investigating" | "resolved" | "false-positive";
}

export async function GET() {
  const db = getDb();

  const bets = db.prepare("SELECT * FROM bets ORDER BY created_at DESC LIMIT 500").all() as Bet[];
  const alerts: Alert[] = [];
  const flaggedWallets = new Set<string>();

  // 1. Wash trading: same wallet betting both sides of a fight
  const fightWalletSides: Record<string, Record<string, Set<string>>> = {};
  for (const bet of bets) {
    if (!fightWalletSides[bet.fight_id]) fightWalletSides[bet.fight_id] = {};
    if (!fightWalletSides[bet.fight_id][bet.wallet]) fightWalletSides[bet.fight_id][bet.wallet] = new Set();
    fightWalletSides[bet.fight_id][bet.wallet].add(bet.side);
  }
  for (const [fightId, wallets] of Object.entries(fightWalletSides)) {
    for (const [wallet, sides] of Object.entries(wallets)) {
      if (sides.size > 1) {
        flaggedWallets.add(wallet);
        alerts.push({
          time: new Date().toISOString(),
          type: "Wash Trading",
          severity: "high",
          description: `Wallet ${wallet.slice(0, 8)}... bet both sides of fight ${fightId.slice(0, 8)}`,
          status: "investigating",
        });
      }
    }
  }

  // 2. Unusually large bets (> 3x average)
  const avgBet = bets.length > 0 ? bets.reduce((s, b) => s + b.amount, 0) / bets.length : 0;
  const threshold = Math.max(avgBet * 3, 100);
  for (const bet of bets) {
    if (bet.amount > threshold) {
      flaggedWallets.add(bet.wallet);
      alerts.push({
        time: bet.created_at,
        type: "Large Bet",
        severity: bet.amount > threshold * 2 ? "high" : "medium",
        description: `$${bet.amount.toFixed(2)} bet by ${bet.wallet.slice(0, 8)}... (avg: $${avgBet.toFixed(2)})`,
        status: "investigating",
      });
    }
  }

  // 3. Coordinated patterns: multiple wallets placing similar bets in short window
  const recentBets = bets.slice(0, 50);
  const timeClusters: Record<string, Bet[]> = {};
  for (const bet of recentBets) {
    const key = `${bet.fight_id}_${bet.side}_${Math.round(bet.amount / 10) * 10}`;
    if (!timeClusters[key]) timeClusters[key] = [];
    timeClusters[key].push(bet);
  }
  for (const [, cluster] of Object.entries(timeClusters)) {
    if (cluster.length >= 3) {
      const uniqueWallets = new Set(cluster.map((b) => b.wallet));
      if (uniqueWallets.size >= 3) {
        alerts.push({
          time: cluster[0].created_at,
          type: "Coordinated Betting",
          severity: "medium",
          description: `${uniqueWallets.size} wallets placed similar bets on the same fight`,
          status: "investigating",
        });
        uniqueWallets.forEach((w) => flaggedWallets.add(w));
      }
    }
  }

  // 4. Per-fight health
  const fightIds = [...new Set(bets.map((b) => b.fight_id))];
  const perFightHealth: Record<string, { suspicious: boolean; alerts: number }> = {};
  for (const fid of fightIds) {
    const fightAlerts = alerts.filter((a) => a.description.includes(fid.slice(0, 8)));
    perFightHealth[fid] = {
      suspicious: fightAlerts.length > 0,
      alerts: fightAlerts.length,
    };
  }

  // Integrity score: 100 = clean, lower = more issues
  const penalty = Math.min(alerts.length * 8, 80);
  const integrityScore = Math.max(100 - penalty, 0);

  return NextResponse.json({
    integrityScore,
    flaggedAccounts: flaggedWallets.size,
    unusualPatterns: alerts.filter((a) => a.type !== "Large Bet").length,
    manipulationBlocked: alerts.filter((a) => a.severity === "high").length,
    alerts: alerts.slice(0, 20),
    perFightHealth,
  });
}
