import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  const db = getDb();

  const fighters = db.prepare(`
    SELECT id, name, nickname, weight, height, reach, style, avatar,
      rating, striking, grappling, cardio, chin, speed,
      elo, wins, losses, streak, ko_wins, sub_wins, dec_wins
    FROM fighters
    ORDER BY elo DESC
  `).all();

  return NextResponse.json(fighters);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, nickname, style, weight, height, reach, striking, grappling, cardio, chin, speed } = body;

    if (!name || !style || !weight || !height || !reach) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const totalStats = (striking ?? 0) + (grappling ?? 0) + (cardio ?? 0) + (chin ?? 0) + (speed ?? 0);
    if (totalStats > 350) {
      return NextResponse.json({ error: "Total stat points cannot exceed 350" }, { status: 400 });
    }

    const rating = Math.round(((striking ?? 50) + (grappling ?? 50) + (cardio ?? 50) + (chin ?? 50) + (speed ?? 50)) / 5);
    const id = crypto.randomUUID();

    const styleColors: Record<string, string> = {
      Striker: "#ef4444",
      Grappler: "#3b82f6",
      Balanced: "#a855f7",
    };
    const avatar = `🥊${styleColors[style] || "#4ade80"}`;

    const db = getDb();
    db.prepare(`
      INSERT INTO fighters (id, name, nickname, weight, height, reach, style, avatar, rating, striking, grappling, cardio, chin, speed, elo, wins, losses, ko_wins, sub_wins, dec_wins, streak)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1500, 0, 0, 0, 0, 0, 0)
    `).run(id, name, nickname || null, weight, height, reach, style, avatar, rating, striking ?? 50, grappling ?? 50, cardio ?? 50, chin ?? 50, speed ?? 50);

    const fighter = db.prepare("SELECT * FROM fighters WHERE id = ?").get(id);
    return NextResponse.json(fighter, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
