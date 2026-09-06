import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface NewsArticle {
  id: string;
  type: "recap" | "streak" | "upset" | "rankings" | "whale" | "season";
  headline: string;
  body: string;
  category: "Recaps" | "Rankings" | "Betting" | "Streaks";
  fightId?: string;
  timestamp: string;
}

function methodLabel(method: string): string {
  if (!method) return "defeats";
  const m = method.toUpperCase();
  if (m.includes("KO") || m.includes("TKO")) return "knocks out";
  if (m.includes("SUB")) return "submits";
  if (m.includes("DEC")) return "outpoints";
  return "defeats";
}

function methodNoun(method: string): string {
  if (!method) return "decision";
  const m = method.toUpperCase();
  if (m.includes("KO") || m.includes("TKO")) return "knockout";
  if (m.includes("SUB")) return "submission";
  return "decision";
}

export async function GET() {
  const db = getDb();
  const articles: NewsArticle[] = [];

  // 1. Fight recaps from finished fights
  const fights = db.prepare(`
    SELECT f.id, f.winner_id, f.method, f.scheduled_at, f.sim_log,
      fa.id as fa_id, fa.name as fa_name, fa.nickname as fa_nickname, fa.elo as fa_elo,
      fb.id as fb_id, fb.name as fb_name, fb.nickname as fb_nickname, fb.elo as fb_elo
    FROM fights f
    JOIN fighters fa ON f.fighter_a_id = fa.id
    JOIN fighters fb ON f.fighter_b_id = fb.id
    WHERE f.status = 'finished' AND f.winner_id IS NOT NULL
    ORDER BY f.scheduled_at DESC
    LIMIT 20
  `).all() as Record<string, unknown>[];

  for (const f of fights) {
    const winnerId = f.winner_id as string;
    const winnerName = winnerId === f.fa_id ? f.fa_name as string : f.fb_name as string;
    const winnerNick = winnerId === f.fa_id ? f.fa_nickname as string : f.fb_nickname as string;
    const loserName = winnerId === f.fa_id ? f.fb_name as string : f.fa_name as string;
    const method = f.method as string;
    const verb = methodLabel(method);
    const noun = methodNoun(method);

    articles.push({
      id: `recap-${f.id}`,
      type: "recap",
      headline: `${winnerName.toUpperCase()} ${verb.toUpperCase()} ${loserName.toUpperCase()}`,
      body: `${winnerName} "${winnerNick}" secured a decisive ${noun} victory over ${loserName} in their highly anticipated matchup. The ${noun} finish showcases ${winnerName}'s elite skill set and cements their position as a top contender in the AllFights rankings.`,
      category: "Recaps",
      fightId: f.id as string,
      timestamp: f.scheduled_at as string,
    });
  }

  // 2. Streak alerts (streak > 3 or < -3)
  const streakers = db.prepare(`
    SELECT id, name, nickname, streak, wins, losses
    FROM fighters
    WHERE streak > 3 OR streak < -3
    ORDER BY ABS(streak) DESC
    LIMIT 10
  `).all() as Record<string, unknown>[];

  for (const s of streakers) {
    const streak = s.streak as number;
    const name = s.name as string;
    if (streak > 0) {
      articles.push({
        id: `streak-${s.id}`,
        type: "streak",
        headline: `${name.toUpperCase()} EXTENDS WINNING STREAK TO ${streak}`,
        body: `${name} "${s.nickname}" is on a tear with ${streak} consecutive victories. Standing at ${s.wins}W-${s.losses}L, this dominant run has caught the attention of bettors and analysts across the AllFights platform.`,
        category: "Streaks",
        timestamp: new Date().toISOString(),
      });
    } else {
      articles.push({
        id: `streak-${s.id}`,
        type: "streak",
        headline: `${name.toUpperCase()} DROPS ${Math.abs(streak)} STRAIGHT`,
        body: `Tough times for ${name} "${s.nickname}" who has now lost ${Math.abs(streak)} fights in a row. Currently sitting at ${s.wins}W-${s.losses}L, fans are wondering if a turnaround is coming.`,
        category: "Streaks",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 3. Upset alerts - winning bets with high odds (> 3.0)
  const upsets = db.prepare(`
    SELECT b.odds, b.amount, b.payout, b.side, f.id as fight_id, f.scheduled_at,
      fa.name as fa_name, fb.name as fb_name, f.winner_id, fa.id as fa_id
    FROM bets b
    JOIN fights f ON b.fight_id = f.id
    JOIN fighters fa ON f.fighter_a_id = fa.id
    JOIN fighters fb ON f.fighter_b_id = fb.id
    WHERE b.status = 'won' AND b.odds > 3.0
    ORDER BY b.odds DESC
    LIMIT 10
  `).all() as Record<string, unknown>[];

  const seenUpsetFights = new Set<string>();
  for (const u of upsets) {
    const fightId = u.fight_id as string;
    if (seenUpsetFights.has(fightId)) continue;
    seenUpsetFights.add(fightId);
    const winnerId = u.winner_id as string;
    const winnerName = winnerId === u.fa_id ? u.fa_name as string : u.fb_name as string;
    const loserName = winnerId === u.fa_id ? u.fb_name as string : u.fa_name as string;
    const odds = (u.odds as number).toFixed(2);

    articles.push({
      id: `upset-${fightId}`,
      type: "upset",
      headline: `UPSET ALERT: ${winnerName.toUpperCase()} DEFEATS ${loserName.toUpperCase()} AT ${odds} ODDS`,
      body: `In a shocking turn of events, underdog ${winnerName} pulled off a massive upset against the heavily favored ${loserName}. Bettors who backed the underdog at ${odds}x odds are celebrating big payouts tonight.`,
      category: "Betting",
      fightId,
      timestamp: u.scheduled_at as string,
    });
  }

  // 4. Rankings moves - top ELO fighters
  const topFighters = db.prepare(`
    SELECT id, name, nickname, elo, wins, losses, streak
    FROM fighters
    ORDER BY elo DESC
    LIMIT 5
  `).all() as Record<string, unknown>[];

  topFighters.forEach((f, i) => {
    articles.push({
      id: `rank-${f.id}`,
      type: "rankings",
      headline: `${(f.name as string).toUpperCase()} HOLDS #${i + 1} IN GLOBAL RANKINGS`,
      body: `With an ELO rating of ${f.elo}, ${f.name} "${f.nickname}" sits at #${i + 1} in the AllFights global rankings. Their ${f.wins}W-${f.losses}L record${(f.streak as number) > 0 ? ` and current ${f.streak}-fight win streak` : ""} makes them one of the most watched fighters on the platform.`,
      category: "Rankings",
      timestamp: new Date().toISOString(),
    });
  });

  // 5. Whale watch - large bets on upcoming fights
  const whales = db.prepare(`
    SELECT b.amount, b.side, f.id as fight_id, f.scheduled_at,
      fa.name as fa_name, fb.name as fb_name
    FROM bets b
    JOIN fights f ON b.fight_id = f.id
    JOIN fighters fa ON f.fighter_a_id = fa.id
    JOIN fighters fb ON f.fighter_b_id = fb.id
    WHERE f.status = 'upcoming'
    ORDER BY b.amount DESC
    LIMIT 5
  `).all() as Record<string, unknown>[];

  for (const w of whales) {
    const amount = w.amount as number;
    if (amount < 100) continue;
    const backedFighter = (w.side as string) === "A" ? w.fa_name as string : w.fb_name as string;
    articles.push({
      id: `whale-${w.fight_id}-${amount}`,
      type: "whale",
      headline: `WHALE WATCH: ${amount.toLocaleString()} SOL DROPPED ON ${backedFighter.toUpperCase()}`,
      body: `A high-roller has placed a massive ${amount.toLocaleString()} SOL bet backing ${backedFighter} in their upcoming bout. Big money is moving and the odds may shift as more wagers come in.`,
      category: "Betting",
      fightId: w.fight_id as string,
      timestamp: w.scheduled_at as string,
    });
  }

  // Sort by timestamp descending
  articles.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(articles);
}
