import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { simulateFight, type FighterStats } from "@/lib/simulation";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fighterAId, fighterBId, count: rawCount } = body;

  if (!fighterAId || !fighterBId) {
    return NextResponse.json({ error: "fighterAId and fighterBId required" }, { status: 400 });
  }

  const count = Math.min(Math.max(1, rawCount ?? 1000), 10000);

  const db = getDb();
  const a = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fighterAId) as FighterStats | undefined;
  const b = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fighterBId) as FighterStats | undefined;
  if (!a || !b) return NextResponse.json({ error: "Fighter not found" }, { status: 404 });

  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  const methods = { koA: 0, tkoA: 0, subA: 0, decA: 0, koB: 0, tkoB: 0, subB: 0, decB: 0 };
  const roundDist: Record<number, number> = {};
  let totalRounds = 0;

  for (let i = 0; i < count; i++) {
    const seed = randomBytes(16).toString("hex");
    const result = simulateFight(a, b, 3, seed, "lab", i);

    totalRounds += result.totalRounds;

    if (result.winner === "A") {
      winsA++;
      if (result.method === "KO") methods.koA++;
      else if (result.method === "TKO") methods.tkoA++;
      else if (result.method === "SUB") methods.subA++;
      else methods.decA++;
    } else if (result.winner === "B") {
      winsB++;
      if (result.method === "KO") methods.koB++;
      else if (result.method === "TKO") methods.tkoB++;
      else if (result.method === "SUB") methods.subB++;
      else methods.decB++;
    } else {
      draws++;
    }

    roundDist[result.totalRounds] = (roundDist[result.totalRounds] || 0) + 1;
  }

  const avgRounds = Math.round((totalRounds / count) * 100) / 100;
  const margin = 1.05;
  const probA = winsA / count;
  const probB = winsB / count;

  return NextResponse.json({
    fighterA: { id: a.id, name: a.name, style: a.style },
    fighterB: { id: b.id, name: b.name, style: b.style },
    count,
    winsA,
    winsB,
    draws,
    winPctA: Math.round((winsA / count) * 1000) / 10,
    winPctB: Math.round((winsB / count) * 1000) / 10,
    drawPct: Math.round((draws / count) * 1000) / 10,
    methods: {
      fighterA: {
        ko: methods.koA + methods.tkoA,
        sub: methods.subA,
        dec: methods.decA,
      },
      fighterB: {
        ko: methods.koB + methods.tkoB,
        sub: methods.subB,
        dec: methods.decB,
      },
    },
    avgRounds,
    roundDistribution: roundDist,
    impliedOdds: {
      fairA: probA > 0 ? Math.round((margin / probA) * 100) / 100 : 99.99,
      fairB: probB > 0 ? Math.round((margin / probB) * 100) / 100 : 99.99,
    },
  });
}
