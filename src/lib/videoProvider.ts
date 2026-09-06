// Adapter for generative fight video. Swaps between a mock renderer (default, no
// external calls) and a real provider once RUNWAY_API_KEY (or another supported
// provider key) is set in the environment. Never used to determine a fight's
// official result — that stays deterministic in src/lib/simulation.ts.

export interface RoundEvent {
  round: number;
  scoreA: number;
  scoreB: number;
  events: string[];
  finish?: { winner: string; method: string };
}

export interface VideoGenerationResult {
  status: "queued" | "processing" | "ready" | "failed" | "unavailable";
  videoUrl?: string;
  providerJobId?: string;
  error?: string;
}

interface FightVideoContext {
  fightId: string;
  fighterAName: string;
  fighterBName: string;
  rounds: RoundEvent[];
  winnerName: string | null;
  method: string | null;
}

/** Builds a text-to-video prompt from the deterministic event log. Keeps the
 * provider grounded in what actually happened instead of hallucinating an outcome. */
export function buildFightVideoPrompt(ctx: FightVideoContext): string {
  const beats = ctx.rounds
    .map(r => `Round ${r.round}: ${r.events.slice(0, 4).join("; ")}${r.finish ? ` — finishes by ${r.finish.method}` : ""}`)
    .join("\n");

  return [
    `Cinematic MMA broadcast footage. Fighter "${ctx.fighterAName}" (red corner) vs "${ctx.fighterBName}" (blue corner), octagon cage, arena lighting, crowd, TV-style camera cuts.`,
    beats,
    ctx.winnerName ? `Fight ends with ${ctx.winnerName} winning by ${ctx.method}.` : "",
    "Do not invent a different winner or method than described above.",
  ].filter(Boolean).join("\n\n");
}

interface ProviderAdapter {
  name: string;
  isConfigured(): boolean;
  submit(prompt: string): Promise<VideoGenerationResult>;
  poll(jobId: string): Promise<VideoGenerationResult>;
}

// Runway ML (Gen-3/Gen-4 style) async image/text-to-video job API.
// Docs shape: POST /v1/image_to_video or /v1/text_to_video -> { id }, then
// GET /v1/tasks/{id} -> { status, output: [url] }.
const runwayAdapter: ProviderAdapter = {
  name: "runway",
  isConfigured() {
    return !!process.env.RUNWAY_API_KEY;
  },
  async submit(prompt: string) {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) return { status: "unavailable" };
    try {
      const res = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify({ promptText: prompt, model: "gen3a_turbo", duration: 10, ratio: "1280:768" }),
      });
      if (!res.ok) return { status: "failed", error: `Runway submit failed: ${res.status}` };
      const data = await res.json();
      return { status: "queued", providerJobId: data.id };
    } catch (err) {
      return { status: "failed", error: err instanceof Error ? err.message : "Unknown provider error" };
    }
  },
  async poll(jobId: string) {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) return { status: "unavailable" };
    try {
      const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
      });
      if (!res.ok) return { status: "failed", error: `Runway poll failed: ${res.status}` };
      const data = await res.json();
      if (data.status === "SUCCEEDED") return { status: "ready", videoUrl: data.output?.[0], providerJobId: jobId };
      if (data.status === "FAILED") return { status: "failed", error: data.failureReason ?? "Provider job failed", providerJobId: jobId };
      return { status: "processing", providerJobId: jobId };
    } catch (err) {
      return { status: "failed", error: err instanceof Error ? err.message : "Unknown provider error" };
    }
  },
};

// Mock adapter: never calls out to the network. Used whenever no provider key
// is configured so the feature is demoable without an account.
const mockAdapter: ProviderAdapter = {
  name: "mock",
  isConfigured() {
    return true;
  },
  async submit() {
    return { status: "unavailable", error: "No video provider configured. Set RUNWAY_API_KEY to enable real generation." };
  },
  async poll() {
    return { status: "unavailable" };
  },
};

function getActiveAdapter(): ProviderAdapter {
  if (runwayAdapter.isConfigured()) return runwayAdapter;
  return mockAdapter;
}

export function isVideoProviderConfigured(): boolean {
  return getActiveAdapter().name !== "mock";
}

export function activeVideoProviderName(): string {
  return getActiveAdapter().name;
}

export async function submitFightVideoJob(ctx: FightVideoContext): Promise<VideoGenerationResult> {
  const prompt = buildFightVideoPrompt(ctx);
  return getActiveAdapter().submit(prompt);
}

export async function pollFightVideoJob(jobId: string): Promise<VideoGenerationResult> {
  return getActiveAdapter().poll(jobId);
}
