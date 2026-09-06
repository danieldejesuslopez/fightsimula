import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const fighter = db.prepare(`
    SELECT id, name, nickname, weight, height, reach, style, avatar,
      rating, striking, grappling, cardio, chin, speed,
      elo, wins, losses, streak, ko_wins, sub_wins, dec_wins
    FROM fighters WHERE id = ?
  `).get(id) as Record<string, unknown> | undefined;

  if (!fighter) return NextResponse.json({ error: "Fighter not found" }, { status: 404 });

  // Get fight history from fighter_history table (includes ELO changes)
  const history = db.prepare(`
    SELECT fh.id, fh.fight_id, fh.opponent_id, fh.result, fh.method,
      fh.elo_before, fh.elo_after, fh.created_at,
      op.name as opponent_name
    FROM fighter_history fh
    JOIN fighters op ON fh.opponent_id = op.id
    WHERE fh.fighter_id = ?
    ORDER BY fh.created_at DESC
  `).all(id) as Record<string, unknown>[];

  const fightHistory = history.map((h) => ({
    id: h.id,
    fightId: h.fight_id,
    opponent: { id: h.opponent_id, name: h.opponent_name },
    result: h.result,
    method: h.method,
    eloBefore: h.elo_before,
    eloAfter: h.elo_after,
    eloChange: (h.elo_after as number) - (h.elo_before as number),
    date: h.created_at,
  }));

  return NextResponse.json({ ...fighter, fightHistory });
}
