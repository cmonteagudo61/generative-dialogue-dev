### Generative Dialogue – AI Orientation Guide (2025-08-10)

This guide gets a new AI contributor productive fast: how to run the app, what lives where, key flows, current conventions, recent improvements, how to back up/restore, and what to work on next.

## 1) TL;DR Quickstart
- Node 20.x required. Environment: darwin, local dev.
- Ports: backend `5680`, frontend `3100` (frontend uses 3100 because 3000 is often busy [[memory:3832739]]).
- Env: create `.env` at repo root (and/or `backend/.env`) with valid API keys:
  - `DEEPGRAM_API_KEY`, `X_API_KEY` (Grok/xAI), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.

Run servers:
```bash
cd backend && npm start | cat
# in another terminal
cd client && PORT=3100 npm start | cat
```
Open `http://localhost:3100`.

## 2) Architecture Overview
- Frontend: React (Create React App), key component `client/src/components/BottomContentArea.js` controls the “Catalyst / Dialogue / Summary / WE” tabs.
- Backend: Node/Express `backend/server.js` exposes:
  - WebSocket `/realtime` for audio → Deepgram transcription.
  - REST `POST /api/ai/format` for AI enhancement/summarization/theme extraction.
  - REST `POST /api/session/:sessionId/breakout/:breakoutId/submit` to store breakout results (in-memory, planned MongoDB).
  - REST `POST /api/session/:sessionId/breakout/:breakoutId/vote` to record votes and return tallies.
  - REST `GET /api/session/:sessionId/aggregate` to aggregate narratives/themes/quotes/votes.
- AI Services: Deepgram (STT), Grok/xAI (summary+themes), Anthropic/OpenAI (enhancement fallback/primary via enhancer).

## 3) Key UI Tabs & Flows
- Catalyst
  - Title styling is the shared blue and typography. Attribution is subtle via `.ai-hint` where applicable.
- Dialogue
  - Live Stream shows last three lines (compact visual cue) and grows/scrolls; full transcript is preserved.
  - Start/Stop and Clear are inline with the Live Stream title.
  - “AI Processed Transcript” shows cleaned transcript; Optional Edit toggles a textarea. Save updates displayed text; reprocessing is automatic in flow.
  - Small attribution lines are displayed (e.g., “Transcribed by Deepgram”, “Enhanced by {service}”).
- Summary
  - “Highlights (Concise)” and “Top Themes”: editable textareas with live rich preview using a light `renderMarkdown` (headings h2–h6, bold, lists).
  - Submit to Group posts content to backend; voting is only in footer (thumbs up/down). Vote tallies update live in the Summary tab.
- WE (Collective Wisdom)
  - Auto-loads aggregation when the tab is shown. Displays narrative, themes, quotes, and votes with rich formatting.

## 4) Important Files
- Frontend UI
  - `client/src/components/BottomContentArea.js` – tabs, transcription control, AI calls, submit/vote/aggregate.
  - `client/src/components/BottomContentArea.css` – unified styles: `.tab-section-title`, `.ai-hint`, `.live-transcript`, etc.
  - `client/src/components/AppLayout.js` – page layout; passes voting, loop state, and navigation controls to footer.
  - `client/src/components/FooterNavigation.js` – audio/camera/call/vote/loop buttons; votes hook into backend.
  - Video grid & Loop Magnifier (community view):
    - `client/src/components/video/VideoGrid.js`
    - `client/src/components/video/CommunityViewExperimental.js`
    - `client/src/components/video/LoopMagnifier.js`
- Backend
  - `backend/server.js` – WebSocket + REST endpoints and integration with `enhanced-transcript-service`.
  - `backend/enhanced-transcript-service.js` – orchestrates enhancer (Anthropic/OpenAI) and value-adds.

## 5) Data Contracts (important)
- POST `/api/ai/format`
  - Req: `{ transcript: string, options?: object }`
  - Res: `{ formatted, enhancedText, summaryText, themesText, service, ... }` where `service` reflects the enhancer (e.g., `anthropic`).
- POST `/api/session/:sid/breakout/:bid/submit`
  - Body may include any subset of `{ text, enhancedText, summaryText, themesText, quotes }`.
- POST `/api/session/:sid/breakout/:bid/vote` → `{ vote: 'up'|'down' }` → `{ tallies: { up, down, total } }`.
- GET `/api/session/:sid/aggregate` → `{ meta: { narrative, themesText, quotes, votes } }`.

Dev IDs: `sessionId` & `breakoutId` are stored in `localStorage` during development.

## 6) Recent UI/UX Improvements (2025-08)
- Compact Live Stream (3 lines + 10px height bump) with auto-scroll; full transcript preserved.
- Clean aesthetic across all tabs: no borders/shadows, consistent blue titles, unified spacing.
- Summary previews render rich markdown; removed stray hash artifacts by ensuring blank lines and parser tweaks.
- Voting wired via footer; Summary tally updates.
- WE loads automatically on tab activation (no button).
- Loop magnifier re-wired globally; community-view labels tightened (left/bottom offset halved) with square corners.
- Subtle AI attribution via `.ai-hint` in relevant sections.

## 7) Styling Conventions
- Section titles use `.tab-section-title` (Inter, 21px, 600, letter-spacing 0.5px, blue `#3E4C71`).
- Dialogue section headers use the same typography as Catalyst.
- Live transcript height: `calc(3.6em + 10px)`; `line-height: 1.2em`.
- Name labels: square corners, tighter offsets (regular 2.5px; magnified ~2px).

## 8) State, Hooks, and Gotchas
- React hooks are used extensively (`useMemo`, `useCallback`, `useEffect`). Heed ESLint’s missing dependency warnings.
- `renderMarkdown` is intentionally simple. If headings show raw `#`, ensure blank lines precede headings or extend the regex.
- WebSocket port mismatches were a common issue; ensure frontend uses `ws://localhost:5680/realtime`.
- On disconnect, backend stops Deepgram and cancels reconnection attempts.

## 9) Backups, Tags, and Restore
- We keep timestamped local backups at repo root: `stable-backup-YYYYMMDD_HHMMSS/` plus a `.tar.gz`.
- Backups are excluded from git via `.gitignore` (avoid large pushes). Use annotated Git tags to mark stable states.

Create a fresh backup and tag:
```bash
TS=$(date +%Y%m%d_%H%M%S)
BACKUP=/Users/carlosmonteagudo/generative-dialogue-dev/stable-backup-$TS
mkdir -p "$BACKUP"
rsync -a --exclude ".git" --exclude "node_modules" --exclude "*.tar.gz" --exclude "backups/**" . "$BACKUP"
tar -czf stable-backup-$TS.tar.gz stable-backup-$TS
git add -A && git commit -m "chore: stable $TS" || true
git tag -a stable-$TS -m "Stable backup $TS"
git push && git push --tags
```

Restore a tagged version:
```bash
git fetch --all --tags
git checkout tags/stable-YYYYMMDD_HHMMSS -b restore-YYYYMMDD
```

## 10) MongoDB (Planned Work)
- Migrate in-memory session store to MongoDB. Proposed collections:
  - `sessions` (id, metadata, createdAt)
  - `breakouts` (sessionId, id, submissions[], votes[])
  - `submissions` (breakoutId, enhancedText, summaryText, themesText, quotes[], userIds, timestamps)
  - `votes` (breakoutId, userId, vote, timestamp)
  - `journals` (userId, sessionId, entries[])
- Replace submit/vote/aggregate endpoints to read/write MongoDB.

## 11) How To Change Things Safely
- Prefer small edits over sweeping refactors.
- After non-trivial changes: build/run both servers and sanity-test Dialogue → Summary → WE flows.
- Run ESLint via CRA; fix obvious warnings, especially hook deps.
- Keep ports consistent (backend 5680; frontend 3100). Update URLs in `BottomContentArea.js` only if backend port changes.

## 12) Testing the Core Flow (Manual)
1) Start servers.
2) In Dialogue tab, click Start; speak a few sentences.
3) Confirm Live Stream last-three-lines behavior; stop recording.
4) Confirm AI Processed Transcript renders with attribution; try Optional Edit → Save.
5) Go to Summary, edit Highlights/Themes, verify formatting preview; click “Submit to Group”.
6) Click footer thumbs up/down; verify tally updates.
7) Go to WE; confirm narrative/themes/quotes/votes load automatically.

## 13) Known Issues / Watchouts
- Large backups can cause GitHub push failures; ensure backups remain excluded by `.gitignore`.
- The mini-markdown renderer is intentionally limited; extend carefully.
- If Loop magnifier appears inactive, ensure view is set to community/all and global loop state is on (footer toggle).

## 14) Where To Look First (Hotspots)
- Frontend logic: `BottomContentArea.js` (AI calls, submit/vote, aggregate, UI rendering).
- Backend logic: `server.js` (format/submit/vote/aggregate) and `enhanced-transcript-service.js`.
- Video grid & loop: `VideoGrid.js`, `CommunityViewExperimental.js`, `LoopMagnifier.js`.

## 15) Style & Conventions
- Clear naming, no cryptic abbreviations.
- Guard clauses, minimal nesting, explicit types where applicable.
- Comments for “why”, not “what”. Avoid TODO – implement instead.

## 16) Roadmap
- Persist to MongoDB.
- Replace textareas with optional WYSIWYG for Highlights/Themes (respecting minimal footprint).
- Toasts/snackbars for vote confirmation and submissions.
- Wire real `sessionId`/`breakoutId` from routing/meeting context.

## 17) Contact Points in Code
- Start here for orientation: `AI_ORIENTATION_GUIDE_20250810.md` (this file), `README.md`.
- For UI questions: `BottomContentArea.js` and `BottomContentArea.css`.
- For AI behavior: `/api/ai/format` in `backend/server.js` and `enhanced-transcript-service.js`.

— End of Guide —


