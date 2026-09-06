import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { submitFightVideoJob, pollFightVideoJob, isVideoProviderConfigured, activeVideoProviderName, type RoundEvent } from "@/lib/videoProvider";

// GET /api/fights/[id]/video — current status; polls the provider if a job is in flight.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const fight = db.prepare("SELECT id, video_status, video_url, video_job_id, video_error FROM fights WHERE id = ?").get(id) as
    | { id: string; video_status: string; video_url: string | null; video_job_id: string | null; video_error: string | null }
    | undefined;
  if (!fight) return NextResponse.json({ error: "Fight not found" }, { status: 404 });

  if ((fight.video_status === "queued" || fight.video_status === "processing") && fight.video_job_id) {
    const poll = await pollFightVideoJob(fight.video_job_id);
    if (poll.status !== fight.video_status || poll.videoUrl) {
      db.prepare("UPDATE fights SET video_status = ?, video_url = COALESCE(?, video_url), video_error = ? WHERE id = ?")
        .run(poll.status, poll.videoUrl ?? null, poll.error ?? null, id);
      fight.video_status = poll.status;
      fight.video_url = poll.videoUrl ?? fight.video_url;
      fight.video_error = poll.error ?? null;
    }
  }

  return NextResponse.json({
    status: fight.video_status,
    videoUrl: fight.video_url,
    error: fight.video_error,
    providerConfigured: isVideoProviderConfigured(),
    provider: activeVideoProviderName(),
  });
}

// POST /api/fights/[id]/video — kick off generation from the finished fight's event log.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const fight = db.prepare(`
    SELECT f.*, fa.name as fa_name, fb.name as fb_name
    FROM fights f
    JOIN fighters fa ON f.fighter_a_id = fa.id
    JOIN fighters fb ON f.fighter_b_id = fb.id
    WHERE f.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!fight) return NextResponse.json({ error: "Fight not found" }, { status: 404 });
  if (fight.status !== "finished") return NextResponse.json({ error: "Video can only be generated after the fight is settled" }, { status: 400 });

  const rounds: RoundEvent[] = fight.sim_log ? JSON.parse(fight.sim_log as string) : [];
  const winnerName = fight.winner_id === (fight as { fighter_a_id?: string }).fighter_a_id ? (fight.fa_name as string) : fight.winner_id ? (fight.fb_name as string) : null;

  const result = await submitFightVideoJob({
    fightId: id,
    fighterAName: fight.fa_name as string,
    fighterBName: fight.fb_name as string,
    rounds,
    winnerName,
    method: fight.method as string | null,
  });

  db.prepare("UPDATE fights SET video_status = ?, video_url = COALESCE(?, video_url), video_job_id = ?, video_error = ? WHERE id = ?")
    .run(result.status, result.videoUrl ?? null, result.providerJobId ?? null, result.error ?? null, id);

  return NextResponse.json({
    status: result.status,
    videoUrl: result.videoUrl,
    error: result.error,
    providerConfigured: isVideoProviderConfigured(),
    provider: activeVideoProviderName(),
  });
}
