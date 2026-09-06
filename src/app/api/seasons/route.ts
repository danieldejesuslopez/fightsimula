import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const season = db.prepare("SELECT * FROM seasons WHERE status = 'active' ORDER BY number DESC LIMIT 1").get();
  if (!season) {
    return NextResponse.json({ season: null, standings: [] });
  }

  const standings = db.prepare(
    "SELECT * FROM season_standings WHERE season_id = ? ORDER BY rank ASC"
  ).all((season as { id: string }).id);

  return NextResponse.json({ season, standings });
}
