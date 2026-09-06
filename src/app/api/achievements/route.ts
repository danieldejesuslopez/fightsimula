import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const wallet = req.nextUrl.searchParams.get("wallet");

  const achievements = db.prepare("SELECT * FROM achievements").all();

  let unlocked: string[] = [];
  if (wallet) {
    const rows = db.prepare("SELECT achievement_id FROM user_achievements WHERE wallet = ?").all(wallet) as { achievement_id: string }[];
    unlocked = rows.map(r => r.achievement_id);
  }

  return NextResponse.json({ achievements, unlocked });
}
