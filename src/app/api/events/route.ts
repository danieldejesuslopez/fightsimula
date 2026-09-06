import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const events = db.prepare(`
    SELECT * FROM events ORDER BY scheduled_at DESC
  `).all() as Record<string, unknown>[];

  const result = events.map((event) => {
    const fights = db.prepare(`
      SELECT ef.fight_order, ef.is_main_event, ef.is_co_main,
        f.*,
        fa.id as fa_id, fa.name as fa_name, fa.nickname as fa_nickname, fa.style as fa_style,
        fa.rating as fa_rating, fa.striking as fa_striking, fa.grappling as fa_grappling,
        fa.cardio as fa_cardio, fa.chin as fa_chin, fa.speed as fa_speed,
        fa.weight as fa_weight, fa.height as fa_height, fa.reach as fa_reach,
        fa.elo as fa_elo, fa.wins as fa_wins, fa.losses as fa_losses, fa.streak as fa_streak,
        fb.id as fb_id, fb.name as fb_name, fb.nickname as fb_nickname, fb.style as fb_style,
        fb.rating as fb_rating, fb.striking as fb_striking, fb.grappling as fb_grappling,
        fb.cardio as fb_cardio, fb.chin as fb_chin, fb.speed as fb_speed,
        fb.weight as fb_weight, fb.height as fb_height, fb.reach as fb_reach,
        fb.elo as fb_elo, fb.wins as fb_wins, fb.losses as fb_losses, fb.streak as fb_streak
      FROM event_fights ef
      JOIN fights f ON ef.fight_id = f.id
      JOIN fighters fa ON f.fighter_a_id = fa.id
      JOIN fighters fb ON f.fighter_b_id = fb.id
      WHERE ef.event_id = ?
      ORDER BY ef.fight_order DESC
    `).all(event.id as string) as Record<string, unknown>[];

    const mappedFights = fights.map((f) => {
      const bets = db.prepare(
        "SELECT side, SUM(amount) as total, COUNT(*) as count FROM bets WHERE fight_id = ? GROUP BY side"
      ).all(f.id as string) as { side: string; total: number; count: number }[];

      const allBets = db.prepare("SELECT * FROM bets WHERE fight_id = ?").all(f.id as string) as { id: string; side: string; amount: number; wallet: string; status: string; payout: number | null }[];
      const poolA = bets.find((b) => b.side === "A")?.total || 0;
      const poolB = bets.find((b) => b.side === "B")?.total || 0;
      const totalBets = bets.reduce((sum, b) => sum + b.count, 0);
      const totalVolume = poolA + poolB;

      return {
        id: f.id,
        status: f.status,
        fightOrder: f.fight_order,
        isMainEvent: !!f.is_main_event,
        isCoMain: !!f.is_co_main,
        fighterA: {
          id: f.fa_id, name: f.fa_name, nickname: f.fa_nickname, style: f.fa_style,
          rating: f.fa_rating, striking: f.fa_striking, grappling: f.fa_grappling,
          cardio: f.fa_cardio, chin: f.fa_chin, speed: f.fa_speed,
          weight: f.fa_weight, height: f.fa_height, reach: f.fa_reach,
          elo: f.fa_elo, wins: f.fa_wins, losses: f.fa_losses, streak: f.fa_streak,
        },
        fighterB: {
          id: f.fb_id, name: f.fb_name, nickname: f.fb_nickname, style: f.fb_style,
          rating: f.fb_rating, striking: f.fb_striking, grappling: f.fb_grappling,
          cardio: f.fb_cardio, chin: f.fb_chin, speed: f.fb_speed,
          weight: f.fb_weight, height: f.fb_height, reach: f.fb_reach,
          elo: f.fb_elo, wins: f.fb_wins, losses: f.fb_losses, streak: f.fb_streak,
        },
        oddsA: f.odds_a,
        oddsB: f.odds_b,
        totalVolume,
        totalBets,
        bets: allBets,
        winnerId: f.winner_id,
        method: f.method,
        seedHash: f.seed_hash,
        simLog: f.sim_log,
      };
    });

    return {
      id: event.id,
      name: event.name,
      tagline: event.tagline,
      status: event.status,
      scheduledAt: event.scheduled_at,
      fights: mappedFights,
    };
  });

  return NextResponse.json(result);
}
