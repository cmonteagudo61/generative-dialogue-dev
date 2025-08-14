## Quickstart

- Backend: PORT 5680, MongoDB at MONGODB_URI=mongodb://localhost:27017/generative-dialogue-dev
- Frontend: CRA dev server on PORT 3100 (proxied to backend via `client/src/setupProxy.js`)
- Session bus: `ws(s):///session-bus` (host ↔ participants)
- Realtime ASR: `ws(s):///realtime` (Deepgram upstream)
- Mobile testing: open the ngrok https URL on iPhone; desktop host can add `?role=host`

## How to run (dev)

1) Backend
- From `backend/`:
  - `MONGODB_URI=mongodb://localhost:27017/generative-dialogue-dev PORT=5680 node server.js`
2) Frontend
- From `client/`:
  - `PORT=3100 HOST=0.0.0.0 BROWSER=none npm start`
3) ngrok (if needed for iOS)
- `ngrok http 3100` and open the printed https URL on iPhone

## Joining flow
- Host (desktop): open app with `?role=host` (optional, host-only controls appear)
- Create/ensure session and breakout IDs are auto-provisioned
- Use “Copy Invite” (next to Live Stream) to send `?sessionId=...&breakoutId=...&role=participant` to phones

## What works now
- Live Stream (only last 3 lines visible; full transcript retained). Host broadcasts final lines → phone mirrors
- AI Processed Transcript (enhanced), Highlights, and Top Themes
  - Host-only processing, results broadcast over session bus
  - Themes have fallback extraction if the AI themes call times out (so it always shows)
- Summary tab: editable Highlights/Themes with live preview; Submit to Group persists; vote tallies update in real-time
- WE tab: auto-aggregates narrative/themes/quotes when opened or post-submission
- Loop (Magnifier): wired across all community views listed by user
- Dev buttons: hidden by default (enable with `localStorage.setItem('gd_show_dev_controls','1')`)

## Key files
- Backend: `backend/server.js` (ASR, AI routes, session bus, Mongo persistence)
- Client: `client/src/components/BottomContentArea.js` (tabs, AI flow, voting, WE), `client/src/App.js` (session bus wiring), `client/src/components/video/VideoGrid.js` (community view + magnifier)
- Proxy: `client/src/setupProxy.js`

## Persistence
- Mongo models in `backend/models.js` (Session, Breakout, Submission, Vote, Aggregate)
- Endpoints save submissions/votes if DB is connected; fallback to in-memory

## Notes on mobile
- iOS requires https. Use ngrok to expose the CRA server and rely on dev proxy for same-origin API/WS.
- Phone must join with the same `sessionId/breakoutId` to receive host transcript/AI events.

## Known issues (tracked)
- Deepgram close frames can sometimes surface as `WS_ERR_INVALID_CLOSE_CODE`. We guard errors to avoid crashing.
- Grok themes can time out intermittently; fallback themes avoid empty UI.

## Next steps
- Stabilize WebRTC grid to ensure all peers subscribe correctly on iOS across all tabs
- Add stage timer broadcast (host-controlled start/pause/reset)
- Export: JSON/CSV for submissions, votes, WE narrative/themes/quotes
- Basic host auth + consent banner
- Optional richer editors for Summary tab
- Multi-breakout builder and per-breakout invite links
- Auto-run WE aggregation on host “close voting”, with spinner and timeout fallback

## Backups
- A timestamped tarball will be created at project root (see SAFE_BACKUP_SUMMARY_*.md for path and checksum)
- A git tag will be added on this commit for reproducible restore

## Restore
- From tarball: `tar -xzf <backup>.tar.gz` into a clean directory
- Install deps in `client/` and `backend/` if needed: `npm install`
- Start as in Quickstart; ensure Mongo is running
