import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface RoundResult {
  round: number;
  scoreA: number;
  scoreB: number;
  events: string[];
  finish?: { winner: string; method: string };
}

interface CriteriaScore {
  striking: number;
  grappling: number;
  aggression: number;
  octagonControl: number;
}

interface JudgeRoundScore {
  round: number;
  fighterA: number;
  fighterB: number;
  criteria: { fighterA: CriteriaScore; fighterB: CriteriaScore };
}

interface JudgeCard {
  name: string;
  scores: JudgeRoundScore[];
  totalA: number;
  totalB: number;
}

const JUDGE_NAMES = [
  "Sal D'Amato",
  "Chris Lee",
  "Derek Cleary",
  "Mike Bell",
  "Junichiro Kamijo",
  "Glenn Trowbridge",
];

function scoreRound(round: RoundResult, variance: number): JudgeRoundScore {
  const events = round.events;

  // Count events per fighter
  let strikesA = 0, strikesB = 0;
  let heavyA = 0, heavyB = 0;
  let takedownsA = 0, takedownsB = 0;
  let clinch = 0;

  for (const e of events) {
    const lower = e.toLowerCase();
    if (lower.includes("lands a heavy")) {
      // Determine which fighter by checking the event text position
      if (events.indexOf(e) % 2 === 0) heavyA++; else heavyB++;
    }
    if (lower.includes("lands a clean")) {
      if (events.indexOf(e) % 2 === 0) strikesA++; else strikesB++;
    }
    if (lower.includes("secures a takedown")) {
      if (events.indexOf(e) % 2 === 0) takedownsA++; else takedownsB++;
    }
    if (lower.includes("clinch")) clinch++;
  }

  // Use the sim scores as the primary signal
  const scoreDiff = round.scoreA - round.scoreB;

  // Criteria scoring (1-5 scale)
  const baseStrikingA = Math.min(5, Math.max(1, 3 + (scoreDiff > 0 ? 1 : scoreDiff < 0 ? -1 : 0) + Math.round((Math.random() - 0.5) * variance)));
  const baseStrikingB = Math.min(5, Math.max(1, 3 + (scoreDiff < 0 ? 1 : scoreDiff > 0 ? -1 : 0) + Math.round((Math.random() - 0.5) * variance)));

  const grapplingA = Math.min(5, Math.max(1, 3 + (takedownsA > takedownsB ? 1 : takedownsA < takedownsB ? -1 : 0) + Math.round((Math.random() - 0.5) * variance)));
  const grapplingB = Math.min(5, Math.max(1, 3 + (takedownsB > takedownsA ? 1 : takedownsB < takedownsA ? -1 : 0) + Math.round((Math.random() - 0.5) * variance)));

  const aggressionA = Math.min(5, Math.max(1, 3 + (round.scoreA > round.scoreB ? 1 : -1) + Math.round((Math.random() - 0.5) * variance)));
  const aggressionB = Math.min(5, Math.max(1, 3 + (round.scoreB > round.scoreA ? 1 : -1) + Math.round((Math.random() - 0.5) * variance)));

  const controlA = Math.min(5, Math.max(1, 3 + (scoreDiff > 2 ? 1 : scoreDiff < -2 ? -1 : 0) + Math.round((Math.random() - 0.5) * variance)));
  const controlB = Math.min(5, Math.max(1, 3 + (-scoreDiff > 2 ? 1 : -scoreDiff < -2 ? -1 : 0) + Math.round((Math.random() - 0.5) * variance)));

  // 10-point must system
  const criteriaA = { striking: baseStrikingA, grappling: grapplingA, aggression: aggressionA, octagonControl: controlA };
  const criteriaB = { striking: baseStrikingB, grappling: grapplingB, aggression: aggressionB, octagonControl: controlB };

  const totalCriteriaA = baseStrikingA + grapplingA + aggressionA + controlA;
  const totalCriteriaB = baseStrikingB + grapplingB + aggressionB + controlB;

  let fighterAScore = 10;
  let fighterBScore = 10;
  if (totalCriteriaA > totalCriteriaB) {
    fighterBScore = 9;
  } else if (totalCriteriaB > totalCriteriaA) {
    fighterAScore = 9;
  }
  // 10-8 for dominant rounds
  if (round.scoreA - round.scoreB >= 5) fighterBScore = 8;
  if (round.scoreB - round.scoreA >= 5) fighterAScore = 8;

  return {
    round: round.round,
    fighterA: fighterAScore,
    fighterB: fighterBScore,
    criteria: { fighterA: criteriaA, fighterB: criteriaB },
  };
}

export async function GET(request: NextRequest) {
  const fightId = request.nextUrl.searchParams.get("fightId");
  if (!fightId) return NextResponse.json({ error: "fightId required" }, { status: 400 });

  const db = getDb();
  const fight = db.prepare(`
    SELECT f.*,
      a.name as fighter_a_name, b.name as fighter_b_name
    FROM fights f
    JOIN fighters a ON f.fighter_a_id = a.id
    JOIN fighters b ON f.fighter_b_id = b.id
    WHERE f.id = ?
  `).get(fightId) as any;

  if (!fight) return NextResponse.json({ error: "Fight not found" }, { status: 404 });
  if (fight.status !== "finished") return NextResponse.json({ error: "Fight not finished" }, { status: 400 });
  if (!fight.sim_log) return NextResponse.json({ error: "No sim log" }, { status: 400 });

  const rounds: RoundResult[] = JSON.parse(fight.sim_log);
  const hasFinish = rounds.some(r => r.finish);

  // Pick 3 random judge names
  const shuffled = [...JUDGE_NAMES].sort(() => Math.random() - 0.5);
  const judgeNames = shuffled.slice(0, 3);

  const judges: JudgeCard[] = judgeNames.map((name, idx) => {
    const variance = idx === 0 ? 0.5 : idx === 1 ? 1.0 : 1.5; // increasing variance
    const scores = rounds.map(r => scoreRound(r, variance));
    const totalA = scores.reduce((s, r) => s + r.fighterA, 0);
    const totalB = scores.reduce((s, r) => s + r.fighterB, 0);
    return { name, scores, totalA, totalB };
  });

  // Determine decision
  let aWins = 0, bWins = 0;
  for (const j of judges) {
    if (j.totalA > j.totalB) aWins++;
    else if (j.totalB > j.totalA) bWins++;
  }

  let decision: string;
  if (hasFinish) {
    const finishRound = rounds.find(r => r.finish)!;
    decision = `${finishRound.finish!.winner === "A" ? fight.fighter_a_name : fight.fighter_b_name} wins by ${finishRound.finish!.method} in Round ${finishRound.round}`;
  } else if (aWins === 3 || bWins === 3) {
    decision = `Unanimous Decision: ${aWins === 3 ? fight.fighter_a_name : fight.fighter_b_name}`;
  } else if (aWins >= 2 || bWins >= 2) {
    decision = `Split Decision: ${aWins >= 2 ? fight.fighter_a_name : fight.fighter_b_name}`;
  } else {
    decision = "Majority Draw";
  }

  // Analysis
  const totalScoreA = rounds.reduce((s, r) => s + r.scoreA, 0);
  const totalScoreB = rounds.reduce((s, r) => s + r.scoreB, 0);
  const analysis = hasFinish
    ? `The fight was stopped in Round ${rounds.find(r => r.finish)!.round} via ${rounds.find(r => r.finish)!.finish!.method}. ${totalScoreA > totalScoreB ? fight.fighter_a_name : fight.fighter_b_name} was ahead on the scorecards at the time of the stoppage.`
    : `After ${rounds.length} rounds of action, ${totalScoreA > totalScoreB ? fight.fighter_a_name + " controlled the majority of the fight" : totalScoreB > totalScoreA ? fight.fighter_b_name + " controlled the majority of the fight" : "neither fighter established clear dominance"}. The judges' scores reflect the competitive nature of this bout.`;

  return NextResponse.json({
    fighterA: fight.fighter_a_name,
    fighterB: fight.fighter_b_name,
    judges,
    decision,
    analysis,
    method: fight.method,
  });
}
