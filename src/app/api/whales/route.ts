import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  // Whale leaderboard: aggregate bets by wallet
  const whales = db.prepare(`
    SELECT
      b.wallet,
      u.username,
      SUM(b.amount) as total_wagered,
      COUNT(*) as total_bets,
      SUM(CASE WHEN b.status = 'won' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN b.status = 'lost' THEN 1 ELSE 0 END) as losses,
      MAX(b.amount) as biggest_bet,
      COALESCE(SUM(CASE WHEN b.status = 'won' THEN b.payout ELSE 0 END), 0) as total_won,
      MAX(b.created_at) as last_active
    FROM bets b
    LEFT JOIN users u ON u.wallet = b.wallet
    GROUP BY b.wallet
    ORDER BY total_wagered DESC
    LIMIT 50
  `).all() as Record<string, unknown>[];

  const whalesWithStats = whales.map((w, i) => {
    const totalWagered = w.total_wagered as number;
    const totalWon = w.total_won as number;
    const wins = w.wins as number;
    const totalBets = w.total_bets as number;
    return {
      rank: i + 1,
      wallet: w.wallet,
      username: w.username,
      total_wagered: totalWagered,
      total_bets: totalBets,
      wins,
      losses: w.losses,
      win_rate: totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0,
      biggest_bet: w.biggest_bet,
      roi: totalWagered > 0 ? Math.round(((totalWon - totalWagered) / totalWagered) * 100) : 0,
      last_active: w.last_active,
    };
  });

  // Recent large bets (>100)
  const recentMoves = db.prepare(`
    SELECT b.*, f.fighter_a_id, f.fighter_b_id, fa.name as fighter_a, fb.name as fighter_b
    FROM bets b
    JOIN fights f ON f.id = b.fight_id
    JOIN fighters fa ON fa.id = f.fighter_a_id
    JOIN fighters fb ON fb.id = f.fighter_b_id
    WHERE b.amount >= 100
    ORDER BY b.created_at DESC
    LIMIT 20
  `).all();

  // Whale alerts: biggest bets in last 24h
  const alerts = db.prepare(`
    SELECT b.*, fa.name as fighter_a, fb.name as fighter_b
    FROM bets b
    JOIN fights f ON f.id = b.fight_id
    JOIN fighters fa ON fa.id = f.fighter_a_id
    JOIN fighters fb ON fb.id = f.fighter_b_id
    WHERE b.created_at >= datetime('now', '-24 hours')
    ORDER BY b.amount DESC
    LIMIT 10
  `).all();

  // Summary stats
  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(amount), 0) as total_volume,
      COUNT(DISTINCT wallet) as active_whales,
      COALESCE(AVG(amount), 0) as avg_bet
    FROM bets
    WHERE amount >= 100
  `).get() as Record<string, unknown>;

  return NextResponse.json({
    whales: whalesWithStats,
    recentMoves,
    alerts,
    stats: {
      total_volume: stats.total_volume,
      active_whales: stats.active_whales,
      avg_bet: Math.round(stats.avg_bet as number),
    },
  });
}
