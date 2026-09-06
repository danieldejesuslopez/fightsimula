import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const fight = db.prepare("SELECT * FROM fights WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!fight) return NextResponse.json({ error: "Fight not found" }, { status: 404 });
  if (fight.status !== "upcoming") return NextResponse.json({ error: "Fight is not upcoming" }, { status: 400 });

  const now = new Date().toISOString();
  db.prepare("UPDATE fights SET status = 'live', started_at = ?, updated_at = ? WHERE id = ?")
    .run(now, now, id);

  return NextResponse.json({ success: true, status: "live" });
}
