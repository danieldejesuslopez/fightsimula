// Minimal moderation for the public fight chat: length limits, whitespace
// collapsing, and a small denylist. Not a substitute for real moderation
// tooling before this handles real users at scale.

const BLOCKED_WORDS = ["nigger", "faggot", "kike", "spic", "retard"];

export const CHAT_MESSAGE_MAX_LENGTH = 300;
export const CHAT_RATE_LIMIT_WINDOW_MS = 3000;

export function sanitizeChatMessage(raw: string): { ok: true; message: string } | { ok: false; error: string } {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return { ok: false, error: "Message is empty" };
  if (trimmed.length > CHAT_MESSAGE_MAX_LENGTH) return { ok: false, error: `Message exceeds ${CHAT_MESSAGE_MAX_LENGTH} characters` };
  const lower = trimmed.toLowerCase();
  if (BLOCKED_WORDS.some(w => lower.includes(w))) return { ok: false, error: "Message rejected by moderation filter" };
  return { ok: true, message: trimmed };
}
