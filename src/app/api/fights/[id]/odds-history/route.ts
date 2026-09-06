import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const fight = db.prepare("SELECT id FROM fights WHERE id = ?").get(id);
  if (!fight) return NextResponse.json({ error: "Fight not found" }, { status: 404 });

  const history = db.prepare(`
    SELECT odds_a, odds_b, pool_a, pool_b, total_bets, created_at
    FROM odds_history
    WHERE fight_id = ?
    ORDER BY created_at ASC
  `).all(id) as Record<string, unknown>[];

  const result = history.map((h) => ({
    oddsA: h.odds_a,
    oddsB: h.odds_b,
    poolA: h.pool_a,
    poolB: h.pool_b,
    totalBets: h.total_bets,
    timestamp: h.created_at,
  }));

  return NextResponse.json(result);
}
