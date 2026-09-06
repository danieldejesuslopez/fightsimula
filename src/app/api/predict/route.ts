import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { FighterStats } from "@/lib/simulation";

interface FighterRow {
  id: string;
  name: string;
  striking: number;
  grappling: number;
  cardio: number;
  chin: number;
  speed: number;
  style: string;
  elo: number;
  wins: number;
  losses: number;
  ko_wins: number;
  sub_wins: number;
  dec_wins: number;
  streak: number;
}

export async function GET(req: NextRequest) {
  const fightId = req.nextUrl.searchParams.get("fightId");
  if (!fightId) return NextResponse.json({ error: "fightId required" }, { status: 400 });

  const db = getDb();
  const fight = db.prepare("SELECT * FROM fights WHERE id = ?").get(fightId) as Record<string, unknown> | undefined;
  if (!fight) return NextResponse.json({ error: "Fight not found" }, { status: 404 });

  const a = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fight.fighter_a_id as string) as FighterRow | undefined;
  const b = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fight.fighter_b_id as string) as FighterRow | undefined;
  if (!a || !b) return NextResponse.json({ error: "Fighter not found" }, { status: 404 });

  // Weighted power scores
  const weights = { striking: 0.30, grappling: 0.25, cardio: 0.15, chin: 0.15, speed: 0.15 };
  const powerA = a.striking * weights.striking + a.grappling * weights.grappling + a.cardio * weights.cardio + a.chin * weights.chin + a.speed * weights.speed;
  const powerB = b.striking * weights.striking + b.grappling * weights.grappling + b.cardio * weights.cardio + b.chin * weights.chin + b.speed * weights.speed;

  const winProbA = Math.round((powerA / (powerA + powerB)) * 100);
  const winProbB = 100 - winProbA;

  // Factors
  const factors = [
    { name: "Striking", valueA: a.striking, valueB: b.striking, edge: a.striking > b.striking ? "A" : a.striking < b.striking ? "B" : "even" },
    { name: "Grappling", valueA: a.grappling, valueB: b.grappling, edge: a.grappling > b.grappling ? "A" : a.grappling < b.grappling ? "B" : "even" },
    { name: "Cardio", valueA: a.cardio, valueB: b.cardio, edge: a.cardio > b.cardio ? "A" : a.cardio < b.cardio ? "B" : "even" },
    { name: "Chin", valueA: a.chin, valueB: b.chin, edge: a.chin > b.chin ? "A" : a.chin < b.chin ? "B" : "even" },
    { name: "Speed", valueA: a.speed, valueB: b.speed, edge: a.speed > b.speed ? "A" : a.speed < b.speed ? "B" : "even" },
  ];

  // Method probabilities
  const strikingDiffA = a.striking - b.chin;
  const strikingDiffB = b.striking - a.chin;
  const grapDiffA = a.grappling - b.grappling;
  const grapDiffB = b.grappling - a.grappling;

  let koProb = 25;
  let subProb = 15;
  if (strikingDiffA > 15 || strikingDiffB > 15) koProb += 20;
  if (strikingDiffA > 30 || strikingDiffB > 30) koProb += 10;
  if (grapDiffA > 15 || grapDiffB > 15) subProb += 15;
  if (grapDiffA > 30 || grapDiffB > 30) subProb += 10;
  const decProb = Math.max(10, 100 - koProb - subProb);
  const total = koProb + subProb + decProb;

  const methodProbs = {
    ko: Math.round((koProb / total) * 100),
    sub: Math.round((subProb / total) * 100),
    dec: Math.round((decProb / total) * 100),
  };

  // Analysis text
  const favourite = winProbA >= winProbB ? a : b;
  const underdog = winProbA >= winProbB ? b : a;
  const favProb = Math.max(winProbA, winProbB);

  const lines: string[] = [];
  lines.push(`${favourite.name} enters as the ${favProb > 65 ? "heavy" : "slight"} favourite at ${favProb}% win probability.`);

  if (a.striking > b.striking + 10) lines.push(`${a.name} holds a significant striking advantage (${a.striking} vs ${b.striking}), which could be decisive on the feet.`);
  else if (b.striking > a.striking + 10) lines.push(`${b.name} holds a significant striking advantage (${b.striking} vs ${a.striking}), which could be decisive on the feet.`);
  else lines.push("The striking is closely matched, making the stand-up exchanges a coin flip.");

  if (a.grappling > b.grappling + 10) lines.push(`${a.name} has a clear grappling edge (${a.grappling} vs ${b.grappling}). If the fight goes to the ground, ${a.name} should dominate.`);
  else if (b.grappling > a.grappling + 10) lines.push(`${b.name} has a clear grappling edge (${b.grappling} vs ${a.grappling}). If the fight goes to the ground, ${b.name} should dominate.`);

  if (Math.abs(a.cardio - b.cardio) > 15) {
    const better = a.cardio > b.cardio ? a : b;
    lines.push(`${better.name}'s superior cardio (${better.cardio}) could be a major factor in the championship rounds.`);
  }

  if (favourite.chin < 50) lines.push(`Watch out: ${favourite.name}'s questionable chin (${favourite.chin}) could lead to an upset.`);

  const analysis = lines.join(" ");

  // Confidence
  const confidence = favProb > 70 ? "High" : favProb > 58 ? "Medium" : "Low";

  // Recommendation
  const favSide = winProbA >= winProbB ? "A" : "B";
  const recommendation = {
    side: favSide,
    fighter: favourite.name,
    confidence,
    reasoning: `${favourite.name} has a ${favProb}% probability based on weighted stat analysis.`,
  };

  // Historical accuracy
  const finishedFights = db.prepare(`
    SELECT f.winner_id, f.fighter_a_id, f.fighter_b_id,
      fa.striking as fa_str, fa.grappling as fa_grp, fa.cardio as fa_crd, fa.chin as fa_chn, fa.speed as fa_spd,
      fb.striking as fb_str, fb.grappling as fb_grp, fb.cardio as fb_crd, fb.chin as fb_chn, fb.speed as fb_spd
    FROM fights f
    JOIN fighters fa ON f.fighter_a_id = fa.id
    JOIN fighters fb ON f.fighter_b_id = fb.id
    WHERE f.status = 'finished' AND f.winner_id IS NOT NULL
  `).all() as Record<string, unknown>[];

  let correct = 0;
  for (const ff of finishedFights) {
    const pA = (ff.fa_str as number) * 0.3 + (ff.fa_grp as number) * 0.25 + (ff.fa_crd as number) * 0.15 + (ff.fa_chn as number) * 0.15 + (ff.fa_spd as number) * 0.15;
    const pB = (ff.fb_str as number) * 0.3 + (ff.fb_grp as number) * 0.25 + (ff.fb_crd as number) * 0.15 + (ff.fb_chn as number) * 0.15 + (ff.fb_spd as number) * 0.15;
    const predicted = pA >= pB ? ff.fighter_a_id : ff.fighter_b_id;
    if (predicted === ff.winner_id) correct++;
  }

  const accuracy = {
    total: finishedFights.length,
    correct,
    percentage: finishedFights.length > 0 ? Math.round((correct / finishedFights.length) * 100) : 0,
  };

  return NextResponse.json({
    fightId,
    fighterA: { id: a.id, name: a.name, style: a.style, elo: a.elo, record: `${a.wins}-${a.losses}` },
    fighterB: { id: b.id, name: b.name, style: b.style, elo: b.elo, record: `${b.wins}-${b.losses}` },
    winProbA,
    winProbB,
    methodProbs,
    factors,
    analysis,
    confidence,
    recommendation,
    accuracy,
  });
}
