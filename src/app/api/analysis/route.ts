import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface RoundResult {
  round: number;
  scoreA: number;
  scoreB: number;
  events: string[];
  finish?: { winner: string; method: string };
}

export async function GET(request: NextRequest) {
  const fightId = request.nextUrl.searchParams.get("fightId");
  if (!fightId) return NextResponse.json({ error: "fightId required" }, { status: 400 });

  const db = getDb();
  const fight = db.prepare(`
    SELECT f.*,
      a.name as fighter_a_name, b.name as fighter_b_name,
      a.striking as a_striking, a.grappling as a_grappling,
      b.striking as b_striking, b.grappling as b_grappling
    FROM fights f
    JOIN fighters a ON f.fighter_a_id = a.id
    JOIN fighters b ON f.fighter_b_id = b.id
    WHERE f.id = ?
  `).get(fightId) as any;

  if (!fight) return NextResponse.json({ error: "Fight not found" }, { status: 404 });
  if (!fight.sim_log) return NextResponse.json({ error: "No sim log" }, { status: 400 });

  const rounds: RoundResult[] = JSON.parse(fight.sim_log);

  // Parse events per round
  let totalStrikesA = 0, totalStrikesB = 0;
  let heavyStrikesA = 0, heavyStrikesB = 0;
  let cleanStrikesA = 0, cleanStrikesB = 0;
  let takedownsA = 0, takedownsB = 0;
  let submissionsA = 0, submissionsB = 0;
  let clinchBattles = 0;

  const momentum: { round: number; scoreA: number; scoreB: number; momentumA: number; momentumB: number; events: number }[] = [];
  const keyMoments: { round: number; event: string; significance: string }[] = [];

  const nameA = fight.fighter_a_name;
  const nameB = fight.fighter_b_name;

  for (const round of rounds) {
    let roundStrikesA = 0, roundStrikesB = 0;
    let roundTDA = 0, roundTDB = 0;

    for (const e of round.events) {
      const isA = e.startsWith(nameA);
      const isB = e.startsWith(nameB);

      if (e.includes("lands a heavy")) {
        if (isA) { heavyStrikesA++; totalStrikesA++; roundStrikesA++; }
        if (isB) { heavyStrikesB++; totalStrikesB++; roundStrikesB++; }
        keyMoments.push({ round: round.round, event: e, significance: "Significant power shot" });
      } else if (e.includes("lands a clean")) {
        if (isA) { cleanStrikesA++; totalStrikesA++; roundStrikesA++; }
        if (isB) { cleanStrikesB++; totalStrikesB++; roundStrikesB++; }
      } else if (e.includes("secures a takedown")) {
        if (isA) { takedownsA++; roundTDA++; }
        if (isB) { takedownsB++; roundTDB++; }
        keyMoments.push({ round: round.round, event: e, significance: "Takedown secured" });
      } else if (e.includes("Clinch")) {
        clinchBattles++;
      }
    }

    // Check for finishes — submission counts
    if (round.finish?.method === "SUB") {
      if (round.finish.winner === "A") submissionsA++;
      else submissionsB++;
      keyMoments.push({
        round: round.round,
        event: `${round.finish.winner === "A" ? nameA : nameB} secures a submission!`,
        significance: "Fight-ending submission",
      });
    }
    if (round.finish && (round.finish.method === "KO" || round.finish.method === "TKO")) {
      keyMoments.push({
        round: round.round,
        event: `${round.finish.winner === "A" ? nameA : nameB} scores a ${round.finish.method}!`,
        significance: "Fight-ending stoppage",
      });
    }

    // Momentum: positive = A winning, negative = B winning
    const momentumA = round.scoreA - 10 + roundStrikesA * 0.5 + roundTDA * 2;
    const momentumB = round.scoreB - 10 + roundStrikesB * 0.5 + roundTDB * 2;

    momentum.push({
      round: round.round,
      scoreA: round.scoreA,
      scoreB: round.scoreB,
      momentumA,
      momentumB,
      events: round.events.length,
    });
  }

  // Estimated control time (seconds) from scores
  const controlTimeA = rounds.reduce((s, r) => s + Math.max(0, r.scoreA - 10) * 30, 0);
  const controlTimeB = rounds.reduce((s, r) => s + Math.max(0, r.scoreB - 10) * 30, 0);

  return NextResponse.json({
    fighterA: nameA,
    fighterB: nameB,
    stats: {
      strikesLanded: { a: totalStrikesA, b: totalStrikesB },
      heavyStrikes: { a: heavyStrikesA, b: heavyStrikesB },
      cleanStrikes: { a: cleanStrikesA, b: cleanStrikesB },
      takedowns: { a: takedownsA, b: takedownsB },
      submissionAttempts: { a: submissionsA, b: submissionsB },
      clinchBattles,
      controlTime: { a: controlTimeA, b: controlTimeB },
    },
    momentum,
    keyMoments: keyMoments.slice(0, 10),
    totalRounds: rounds.length,
    method: fight.method,
    winner: fight.winner_id,
  });
}
