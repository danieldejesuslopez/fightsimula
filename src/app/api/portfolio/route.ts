import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  const db = getDb();

  // Get all bets with fight + fighter details
  const bets = db.prepare(`
    SELECT
      b.id, b.fight_id, b.amount, b.side, b.odds, b.status, b.payout, b.created_at,
      f.status as fight_status, f.winner_id, f.method, f.scheduled_at,
      fa.name as fighter_a_name, fa.id as fighter_a_id,
      fb.name as fighter_b_name, fb.id as fighter_b_id
    FROM bets b
    JOIN fights f ON b.fight_id = f.id
    JOIN fighters fa ON f.fighter_a_id = fa.id
    JOIN fighters fb ON f.fighter_b_id = fb.id
    WHERE b.wallet = ?
    ORDER BY b.created_at DESC
  `).all(wallet) as Array<{
    id: string; fight_id: string; amount: number; side: string; odds: number;
    status: string; payout: number | null; created_at: string;
    fight_status: string; winner_id: string | null; method: string | null;
    scheduled_at: string;
    fighter_a_name: string; fighter_a_id: string;
    fighter_b_name: string; fighter_b_id: string;
  }>;

  // Calculate summary stats
  const totalWagered = bets.reduce((s, b) => s + b.amount, 0);
  const wonBets = bets.filter(b => b.status === "won");
  const lostBets = bets.filter(b => b.status === "lost");
  const pendingBets = bets.filter(b => b.status === "pending");
  const totalWon = wonBets.reduce((s, b) => s + (b.payout || 0), 0);
  const netPnL = totalWon - totalWagered + pendingBets.reduce((s, b) => s + b.amount, 0); // pending amount not lost yet
  const resolvedBets = wonBets.length + lostBets.length;
  const winRate = resolvedBets > 0 ? (wonBets.length / resolvedBets) * 100 : 0;
  const roi = totalWagered > 0 ? ((totalWon - (totalWagered - pendingBets.reduce((s, b) => s + b.amount, 0))) / (totalWagered - pendingBets.reduce((s, b) => s + b.amount, 0))) * 100 : 0;

  // Best win / worst loss
  const pnlPerBet = bets
    .filter(b => b.status !== "pending")
    .map(b => b.status === "won" ? (b.payout || 0) - b.amount : -b.amount);
  const bestWin = pnlPerBet.length > 0 ? Math.max(...pnlPerBet) : 0;
  const worstLoss = pnlPerBet.length > 0 ? Math.min(...pnlPerBet) : 0;

  // Current streak
  const resolvedOrdered = bets.filter(b => b.status !== "pending").reverse();
  let streak = 0;
  if (resolvedOrdered.length > 0) {
    const lastStatus = resolvedOrdered[resolvedOrdered.length - 1].status;
    for (let i = resolvedOrdered.length - 1; i >= 0; i--) {
      if (resolvedOrdered[i].status === lastStatus) {
        streak += lastStatus === "won" ? 1 : -1;
      } else break;
    }
  }

  // Market bets
  const marketBets = db.prepare(`
    SELECT
      mb.id, mb.market_id, mb.amount, mb.selection, mb.odds, mb.status, mb.payout, mb.created_at,
      m.question, m.type, m.result
    FROM market_bets mb
    JOIN markets m ON mb.market_id = m.id
    WHERE mb.wallet = ?
    ORDER BY mb.created_at DESC
  `).all(wallet) as Array<{
    id: string; market_id: string; amount: number; selection: string; odds: number;
    status: string; payout: number | null; created_at: string;
    question: string; type: string; result: string | null;
  }>;

  return NextResponse.json({
    summary: {
      totalWagered: Math.round(totalWagered * 100) / 100,
      totalWon: Math.round(totalWon * 100) / 100,
      netPnL: Math.round((totalWon - (totalWagered - pendingBets.reduce((s, b) => s + b.amount, 0))) * 100) / 100,
      winRate: Math.round(winRate * 10) / 10,
      roi: Math.round(roi * 10) / 10,
      totalBets: bets.length,
      activeBets: pendingBets.length,
      bestWin: Math.round(bestWin * 100) / 100,
      worstLoss: Math.round(worstLoss * 100) / 100,
      streak,
    },
    bets,
    marketBets,
  });
}
