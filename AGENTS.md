<!-- BEGIN:nextjs-agent-rules -->

# Mandatory project continuity protocol

Before any task action, every agent **must** read `PROJECT_HANDOFF.md` at the repository root, then read the relevant local Next.js documentation. Every agent **must update `PROJECT_HANDOFF.md`** in the same task when it changes a feature, API, schema, verification status, known gap, or work priority. This requirement applies to all agents, subagents, IDE assistants, and future model versions.

For parallel work, use a non-overlapping role brief from `.agents/roles/`, preserve existing changes, and claim only one bounded implementation surface. Do not delete/reset the SQLite demo database without explicit user approval.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
