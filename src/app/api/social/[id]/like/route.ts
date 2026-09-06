import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { wallet } = body;

  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  const db = getDb();
  const post = db.prepare("SELECT * FROM social_posts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const existing = db.prepare("SELECT * FROM social_likes WHERE post_id = ? AND wallet = ?").get(id, wallet);

  if (existing) {
    db.prepare("DELETE FROM social_likes WHERE post_id = ? AND wallet = ?").run(id, wallet);
    db.prepare("UPDATE social_posts SET likes = likes - 1 WHERE id = ?").run(id);
    return NextResponse.json({ liked: false, likes: (post.likes as number) - 1 });
  } else {
    db.prepare("INSERT INTO social_likes (post_id, wallet) VALUES (?, ?)").run(id, wallet);
    db.prepare("UPDATE social_posts SET likes = likes + 1 WHERE id = ?").run(id);
    return NextResponse.json({ liked: true, likes: (post.likes as number) + 1 });
  }
}
