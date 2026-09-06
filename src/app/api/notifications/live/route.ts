import { getDb } from "@/lib/db";

// GET /api/notifications/live?wallet=0x... — SSE for real-time notifications
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return new Response("wallet required", { status: 400 });

  const encoder = new TextEncoder();
  let closed = false;
  let lastCount = -1;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { closed = true; }
      };

      const poll = () => {
        if (closed) return;
        const db = getDb();
        const unread = db.prepare("SELECT COUNT(*) as count FROM notifications WHERE wallet = ? AND read = 0").get(wallet) as { count: number };

        if (unread.count !== lastCount) {
          lastCount = unread.count;
          const latest = db.prepare(
            "SELECT * FROM notifications WHERE wallet = ? AND read = 0 ORDER BY created_at DESC LIMIT 5"
          ).all(wallet);
          send({ type: "notifications", unreadCount: unread.count, latest });
        }
      };

      poll();
      const interval = setInterval(poll, 3000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
