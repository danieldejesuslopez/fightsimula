# AllFights — Mandatory Project Handoff

> **Required for every human or AI contributor.** Read this file and `AGENTS.md` before inspecting or changing code. Update this document in the same change whenever you add, remove, materially alter, or verify a feature. Do not claim work is complete without recording the verification command/result below.

## Product snapshot

AllFights is a Next.js prediction-market demo for deterministic, AI-simulated combat events. It combines Fight Night cards, live SSE arenas, multiple betting markets, a provably-fair simulation engine, fighter careers, social/retention loops, AI analysis, and market/economy dashboards.

**Current product status:** functional demo. It is **not licensed for real-money wagering** and must not be presented as production gambling infrastructure.

## Read first / operating protocol

1. Read `AGENTS.md`, this file, and the relevant local Next.js guide under `node_modules/next/dist/docs/`.
2. Inspect existing APIs, schemas, and the active UI before editing. Preserve unrelated work.
3. For parallel work, claim one bounded surface in the task/PR description; do not make competing edits to the same file.
4. Keep deterministic fight resolution in `src/lib/simulation.ts`; an LLM or UI may narrate/analyze but **must never determine an official result**.
5. Run `npm run build` after implementation. Record the date and result in the changelog.
6. Update the relevant sections below and add a changelog entry before handoff.

## Local setup

```powershell
npm install
npm run dev
# Open http://localhost:3000
# In a clean demo database, use the Seed button or POST /api/seed.
npm run build
```

- Runtime: Next.js **16.3.4**, React 19, TypeScript, Tailwind CSS v4.
- Database: SQLite (`fightsim.db`) through `better-sqlite3`; database initialization lives in `src/lib/db.ts`.
- Smart-contract support: ethers v6; source material is under `contracts/`.
- Never delete/reset `fightsim.db` without explicit user authorization. It contains local demo state.
- `prisma.config.ts` is a legacy generated artifact excluded from TypeScript; Prisma is not an application dependency.

## Architecture

| Area | Source of truth | Notes |
| --- | --- | --- |
| Database/schema | `src/lib/db.ts` | `getDb()` performs idempotent schema setup and migrations. |
| Deterministic simulation | `src/lib/simulation.ts` | HMAC-SHA256 seeded PRNG; server seed hash is published pre-fight. |
| Live narration | `src/lib/commentary.ts` | Presentation-only; never official result logic. |
| Fight REST API | `src/app/api/fights/route.ts` | Create/list fights and fighter join data. |
| Standard settlement | `src/app/api/fights/[id]/simulate/route.ts` | Settles bets/markets, ELO, history, notifications. |
| Live settlement | `src/app/api/fights/[id]/live/route.ts` | SSE event stream and equivalent live settlement. |
| Home lobby | `src/app/page.tsx` | Fight Night card, fight list, primary navigation. |

## Database domains

- **Core:** `fighters`, `fights`, `bets`, `users`, `notifications`, `odds_history`.
- **Markets/events:** `events`, `event_fights`, `markets`, `market_bets`.
- **Careers/retention:** `fighter_history`, `seasons`, `season_standings`, `achievements`, `user_achievements`, `social_posts`, `social_likes`.
- **Economy/social:** `copy_trading`, `referrals`, `referral_codes`, `predictions`.
- **Safety:** `gambling_limits`, `integrity_alerts`.
- **Chat/ledger:** `fight_chat_messages`, `chain_ledger` (simulated on-chain settlement events).

When adding a table or column, make it idempotent in `initDb()`, add an index where it is queried frequently, and ensure a fresh `/api/seed` supports the UI that depends on it.

## Implemented feature map

### Fight, betting, and trust

- `/` — Fight Lobby and Fight Night card.
- `/fight/[id]` — arena, transcript, replay, markets, odds history, verification.
- `/live` and `/live/[id]` — Fight Night hub and SSE live arena.
- `/verify` — provably-fair explorer.
- Multiple markets: winner, victory method, round, over/under, method+round, goes-distance.
- `/portfolio` — user P&L, ROI and bet history.
- `/liquidity`, `/market-maker` — simulated depth/LP and maker controls.

### Fighters and engagement

- `/fighter/[id]`, `/rankings`, `/create-fighter` — career, ELO, comparison, builder with 350-point budget.
- `/seasons`, `/achievements`, `/leaderboard` — seasonal/achievement loops.
- `/social`, `/whales`, `/copy-trading`, `/referrals` — community, whale visibility, copy trading and referrals.

### AI experiences

- `/predict` — model-style win/method analysis.
- `/simulate-lab` — up to 10,000 deterministic simulations.
- `/judge`, `/analysis`, `/news` — scorecards, post-fight analysis and template-driven AI news.
- Live commentary is generated from deterministic event data through `src/lib/commentary.ts`.

### Safety and market integrity

- `/responsible` and `/api/responsible` — limits, cooldown, self-exclusion, self-assessment.
- `/integrity` and `/api/integrity` — reviewable alerts for rapid betting, unusual size, and imbalance.
- `/security` and `/api/security` — complementary dashboard for wash-trading, large-bet and coordinated-pattern detection.
- `POST /api/bets` enforces self-exclusion, daily wager/loss limits, cooldowns, max-bet limits, and permits both `upcoming` and `live` fights. It also writes a `bet_escrow` row to the simulated ledger.
- `/ledger` and `GET /api/ledger` — simulated on-chain settlement ledger (`src/lib/ledger.ts`); clearly labeled as simulated, not a real chain.
- `GET/POST /api/fights/[id]/video` — AI fight video generation (`src/lib/videoProvider.ts`); mock/`unavailable` unless `RUNWAY_API_KEY` is set; UI panel is in the Arena tab of `/fight/[id]` for finished fights.
- `GET/POST /api/fights/[id]/chat` + `FightChat` component — persistent per-fight chat, polling-based, filtered and rate-limited server-side.

## Known production gaps (do not hide these)

1. Generative fight **video** now has a real adapter (`src/lib/videoProvider.ts`, Runway ML text-to-video) gated behind `RUNWAY_API_KEY`. With no key set it reports `unavailable` honestly rather than faking a clip — nothing has been generated or verified against a live provider account yet.
2. Persistent multiplayer chat now exists (`fight_chat_messages` table, `/api/fights/[id]/chat`, `FightChat` component on `/fight/[id]` and `/live/[id]`) with a length limit, per-wallet rate limit, and a denylist filter. It has no auth-backed identity, muting/banning, or admin moderation UI yet.
3. No production gambling compliance: KYC/age checks, geofencing, licensing, legal policies or AML program.
4. On-chain settlement is still simulated. A `chain_ledger` table (`src/lib/ledger.ts`, `/api/ledger`, `/ledger` page) now records every bet-escrow and payout/refund with a fake tx hash, block number, and confirmation count so the data shape matches a real integration, and `contracts/`/`src/lib/contract.ts` hold the real Solidity + ethers path — but there is still no audited contract deployment, real custody, real USDC, or production market-making capital behind any of it.
5. Safety/integrity tooling is demo-grade heuristic monitoring, not a compliance or fraud decision system.

## Verification status

- **2026-09-06:** `npm run build` passed: 58 app routes generated and TypeScript passed (added `/ledger`, `/api/ledger`, `/api/fights/[id]/video`, `/api/fights/[id]/chat`).
- **2026-09-06:** Manually verified against the dev server: `POST /api/bets` writes a `chain_ledger` row and `GET /api/ledger` returns it; `POST`/`GET /api/fights/[id]/chat` round-trip a message with the correct numeric `seq` for polling (an earlier `rowid AS id, *` alias collision that clobbered the numeric id with the message's UUID was caught and fixed here); `POST /api/fights/[id]/video` returns an honest `unavailable` status with no `RUNWAY_API_KEY` set.
- **2026-09-06:** `npm run build` passed: 55 app routes generated and TypeScript passed.
- **2026-09-06:** Live SSE test passed on `The Reaper vs Dragon Fist`: event feed, commentary, live HP/odds, final DEC settlement and post-fight links rendered.
- **2026-09-06:** Responsible wager enforcement tested with a `$10` max bet and a `$20` request; endpoint correctly returned a validation error.
- `npm run lint` still has pre-existing errors/warnings in several older generated pages (notably synchronous state in effects and explicit `any`). Treat lint cleanup as a dedicated QA task; do not conceal a failing lint result.

## Next recommended work

1. Production legal/compliance design before accepting any non-demo value.
2. Extract duplicated standard/live settlement into one tested server-only service.
3. Add automated tests for simulation determinism, settlement parity, market resolution, and responsible-gambling guards.
4. Implement authenticated identity/wallet ownership rather than demo wallet defaults.
5. Add persistence and moderation if real-time user chat is introduced.

## Multi-agent coordination

Role briefs are in `.agents/roles/`. Assign one role per bounded task, then require its contributor to update this file. Suggested boundaries:

- `backend-settlement.md` — schema, APIs, deterministic settlement.
- `frontend-arena.md` — lobby, arena, live UI and accessibility.
- `ai-experiences.md` — predictors, commentary, analysis and simulator UI.
- `economy-markets.md` — markets, liquidity, maker, portfolio, copy/referrals.
- `safety-compliance.md` — responsible play, integrity, auth/compliance boundaries.
- `quality-release.md` — test plans, build/lint, regression and release notes.

## Next recommended work (video/chat/economy follow-ups)

1. Get a real `RUNWAY_API_KEY` and verify a full submit→poll→ready cycle end to end (untested against a live provider account in this change).
2. Add wallet-authenticated chat identity, muting, and an admin moderation view instead of the current denylist-only filter.
3. If real settlement is ever pursued, replace the simulated `chain_ledger` writes with real contract event indexing rather than in-process fake block numbers.

## Change log

| Date | Change | Verification |
| --- | --- | --- |
| 2026-09-06 | Added a real (Runway-backed, key-gated) AI video generation adapter, persistent per-fight chat, and a simulated on-chain settlement ledger with a dedicated `/ledger` explorer page. | `npm run build` passed (58 routes); manually verified bet→ledger write, chat POST/GET round-trip, and honest `unavailable` video status with no provider key configured. |
| 2026-09-06 | Added mandatory cross-agent handoff, role briefs, server-enforced responsible wagering, integrity console, and live-settlement parity for users/ELO/history/markets. | `npm run build` passed; live SSE and limit guard manually tested. |
| 2026-09-06 | Implemented Fight Night, AI/fighter/economy/social/safety demo surfaces described above. | Build passed during integration. |
