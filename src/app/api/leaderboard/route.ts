import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const leaderboard = db.prepare(`
    SELECT
      wallet,
      COUNT(*) as total_bets,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as losses,
      SUM(amount) as total_wagered,
      SUM(CASE WHEN status = 'won' THEN payout ELSE 0 END) as total_won,
      SUM(CASE WHEN status = 'won' THEN payout - amount ELSE -amount END) as profit
    FROM bets
    WHERE status IN ('won', 'lost')
    GROUP BY wallet
    ORDER BY profit DESC
    LIMIT 50
  `).all();

  return NextResponse.json(leaderboard);
}
