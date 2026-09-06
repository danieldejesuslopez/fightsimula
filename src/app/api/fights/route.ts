import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashSeed, calculateOdds, type FighterStats } from "@/lib/simulation";
import { randomBytes, randomUUID } from "crypto";

export async function GET() {
  const db = getDb();
  const fights = db.prepare(`
    SELECT f.*,
      fa.id as fa_id, fa.name as fa_name, fa.nickname as fa_nickname, fa.style as fa_style,
      fa.rating as fa_rating, fa.striking as fa_striking, fa.grappling as fa_grappling,
      fa.cardio as fa_cardio, fa.chin as fa_chin, fa.speed as fa_speed,
      fa.weight as fa_weight, fa.height as fa_height, fa.reach as fa_reach,
      fa.elo as fa_elo, fa.wins as fa_wins, fa.losses as fa_losses, fa.streak as fa_streak,
      fa.ko_wins as fa_ko_wins, fa.sub_wins as fa_sub_wins, fa.dec_wins as fa_dec_wins,
      fb.id as fb_id, fb.name as fb_name, fb.nickname as fb_nickname, fb.style as fb_style,
      fb.rating as fb_rating, fb.striking as fb_striking, fb.grappling as fb_grappling,
      fb.cardio as fb_cardio, fb.chin as fb_chin, fb.speed as fb_speed,
      fb.weight as fb_weight, fb.height as fb_height, fb.reach as fb_reach,
      fb.elo as fb_elo, fb.wins as fb_wins, fb.losses as fb_losses, fb.streak as fb_streak,
      fb.ko_wins as fb_ko_wins, fb.sub_wins as fb_sub_wins, fb.dec_wins as fb_dec_wins
    FROM fights f
    JOIN fighters fa ON f.fighter_a_id = fa.id
    JOIN fighters fb ON f.fighter_b_id = fb.id
    ORDER BY f.scheduled_at DESC
    LIMIT 20
  `).all() as Record<string, unknown>[];

  const result = fights.map((f: Record<string, unknown>) => {
    const bets = db.prepare("SELECT * FROM bets WHERE fight_id = ?").all(f.id as string);
    return {
      id: f.id, status: f.status, scheduledAt: f.scheduled_at,
      oddsA: f.odds_a, oddsB: f.odds_b,
      winnerId: f.winner_id, method: f.method,
      seedHash: f.seed_hash, serverSeed: f.status === "finished" ? f.server_seed : undefined,
      simLog: f.sim_log, videoUrl: f.video_url, videoStatus: f.video_status,
      fighterA: { id: f.fa_id, name: f.fa_name, nickname: f.fa_nickname, style: f.fa_style, rating: f.fa_rating, striking: f.fa_striking, grappling: f.fa_grappling, cardio: f.fa_cardio, chin: f.fa_chin, speed: f.fa_speed, weight: f.fa_weight, height: f.fa_height, reach: f.fa_reach, elo: f.fa_elo, wins: f.fa_wins, losses: f.fa_losses, streak: f.fa_streak, ko_wins: f.fa_ko_wins, sub_wins: f.fa_sub_wins, dec_wins: f.fa_dec_wins },
      fighterB: { id: f.fb_id, name: f.fb_name, nickname: f.fb_nickname, style: f.fb_style, rating: f.fb_rating, striking: f.fb_striking, grappling: f.fb_grappling, cardio: f.fb_cardio, chin: f.fb_chin, speed: f.fb_speed, weight: f.fb_weight, height: f.fb_height, reach: f.fb_reach, elo: f.fb_elo, wins: f.fb_wins, losses: f.fb_losses, streak: f.fb_streak, ko_wins: f.fb_ko_wins, sub_wins: f.fb_sub_wins, dec_wins: f.fb_dec_wins },
      bets,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { fighterAId, fighterBId, rounds = 3, scheduledAt } = body;
  const db = getDb();

  const a = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fighterAId) as FighterStats;
  const b = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fighterBId) as FighterStats;
  if (!a || !b) return NextResponse.json({ error: "Fighter not found" }, { status: 404 });

  const serverSeed = randomBytes(32).toString("hex");
  const seedH = hashSeed(serverSeed);
  const { oddsA, oddsB } = calculateOdds(a, b);
  const id = randomUUID();

  db.prepare(`
    INSERT INTO fights (id, fighter_a_id, fighter_b_id, rounds, scheduled_at, server_seed, seed_hash, odds_a, odds_b)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, fighterAId, fighterBId, rounds, scheduledAt ?? new Date(Date.now() + 300_000).toISOString(), serverSeed, seedH, oddsA, oddsB);

  return NextResponse.json({ id, seedHash: seedH, oddsA, oddsB, fighterA: a, fighterB: b });
}
