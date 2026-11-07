# ELIA by Prime Health (demo)

ELIA's chat demo, with the NuraLogix DeepAffex face scan running inside ELIA's own scan screens.

## Services (`render.yaml`)
| Service | What it runs |
|---|---|
| `elia-oman-demo` (Node web service) | Full demo. `server.js` serves `public/` with cross-origin isolation headers, which the DeepAffex SDK needs. It also issues DeepAffex tokens. |
| `elia-demo` (static site) | The same page without a server, so the on-device scan only. |

## Environment variables (Render dashboard → Environment; never committed)
| Variable | Enables |
|---|---|
| `DFX_LICENSE_KEY`, `DFX_STUDY_ID` | NuraLogix DeepAffex face scan (see below) |
| `ANTHROPIC_API_KEY` | Claude for photo recognition, meal nutrient estimates and health-record Q&A (`POST /api/ai`, 60 requests per IP per hour). Optional `AI_MODEL_QUICK` / `AI_MODEL_DEFAULT` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Calendar: free/busy lookup and creating plan events |

`GET /api/config` reports which of these are switched on.

## Google Calendar setup
1. In Google Cloud Console, create a project and enable the **Google Calendar API**.
2. Set up the OAuth consent screen:
   - User type: External.
   - Scopes: `calendar.events` and `calendar.freebusy`.
   - While the app is in Testing, add each tester's Google account under Test users.
3. Create credentials: an **OAuth client ID** of type **Web application**.
   - Authorized redirect URI: `https://elia-oman-demo.onrender.com/api/google/callback`.
   - Copy the client ID and secret into Render.

The page needs cross-origin isolation for DeepAffex, which blocks the usual pop-up sign-in hand-off. So sign-in runs on the server:
1. A pop-up opens `/api/google/auth`.
2. Google redirects back to `/api/google/callback`.
3. The server exchanges the code; the client secret stays on the server.
4. The server tells the page over a same-origin `BroadcastChannel`.
5. Calendar calls go through `/api/google/freebusy` and `/api/google/events`.

Tokens are kept in memory for up to an hour and are never sent to the browser.

## DeepAffex setup
Set these in the Render dashboard (Environment). They're never committed.

| Variable | |
|---|---|
| `DFX_LICENSE_KEY` | NuraLogix license key. Stays on the server. |
| `DFX_STUDY_ID` | DeepAffex study ID. |
| `DFX_API_URL` | Optional. Default `https://api.deepaffex.ai`; use a region URL to pin the region. |
| `DFX_TOKEN_TTL_S` | Optional. Token lifetime in seconds; default 3600. |

How a scan gets its token and runs:
1. The page asks `POST /api/dfx/token`.
2. The server registers a device for that browser (`POST {DFX_API_URL}/organizations/licenses`) and returns a short-lived token pair plus the study ID.
   - Each browser gets its own pair, because DeepAffex refresh tokens are single-use.
   - The endpoint is limited to 20 tokens per IP per hour and only answers this site's own pages.
3. The browser runs the Anura Web Core SDK (`@nuralogix.ai/anura-web-core-sdk`).

The SDK is proprietary NuraLogix software. It's installed from npm at build time (`npm run build` copies its runtime assets to `public/dfx-assets`) and is not committed to this repository.

NuraLogix must whitelist the site's domain for its API; otherwise the scan fails with a CORS error.

If DeepAffex isn't configured or reachable, ELIA offers its on-device camera scan instead.

## Run locally
```bash
npm ci && npm run build
DFX_LICENSE_KEY=... DFX_STUDY_ID=... npm start   # http://localhost:10000
```

## Voice mode (Cartesia)
Set `CARTESIA_API_KEY` on the web service. Voice mode then reads ELIA's messages with Cartesia Sonic (`sonic-3.6`) through `POST /api/tts`; the key never reaches the browser. Without it, the page uses the browser's built-in voice.

Optional: `CARTESIA_VOICE_ID` (ELIA's voice, default Skylar `db6b0ed5-d5d3-463d-ae85-518a07d3c2b4`), `CARTESIA_VOICE_ID_ES` / `CARTESIA_VOICE_ID_AR` (a different voice per language), `CARTESIA_VOICE_ID_SIM` (Sim, default Daniel), `CARTESIA_MODEL`, `CARTESIA_VERSION` (default `2026-08-14`). Limit: 400 requests per IP per hour.

## Talking avatar and two-way voice (Tavus)
Set `TAVUS_API_KEY` on the web service. Voice mode then shows ELIA as a Tavus face and runs a real two-way conversation:
Tavus's full pipeline listens through the microphone, decides turns and lets the member interrupt (Sparrow-2 turn detection),
and speaks with the Cartesia voice (`CARTESIA_API_KEY`). Its "LLM" is this server: `POST /api/tavus/llm/chat/completions` is an
OpenAI-compatible streaming endpoint (secured with `TAVUS_LLM_SECRET`, auto-generated if unset) that hands each turn to the
member's own page (`GET /api/tavus/turns/:id` long-poll, `POST /api/tavus/reply/:id`), so the voice conversation is ELIA's own
dialog: buttons picked by meaning, meal scoring, Claude answers. The server picks your face whose name contains "Elia" (or
`TAVUS_FACE_ID`), creates the PAL once (or `TAVUS_PAL_ID`; set `TAVUS_PAL_MODE=echo` if that PAL is echo mode), and ends each
conversation when voice mode closes (15-minute cap, 15 starts per IP per hour). `TAVUS_MODE=echo` falls back to echo mode, where
the page keeps its own speech recognition and Tavus only animates the replies. Without the key, voice mode uses Cartesia and the orb.
The page is served with `Cross-Origin-Embedder-Policy: credentialless` so it stays cross-origin isolated (NuraLogix SDK) while loading the Daily call library.

## Voice-only mode with OpenAI GPT-Live
Set `OPENAI_API_KEY` (a project key with GPT-Live access). Voice mode then offers an **Avatar / Voice** switch: Voice runs
`gpt-live-1` full duplex over WebRTC (`POST /api/live/start` exchanges the browser's SDP offer for the session answer; the key never
reaches the page). The session uses client delegation: whenever the model hands a question to the client, the page answers it
through ELIA's own path (Claude with the member's scores, meals, sleep, devices and insurance) and returns the text as
`session.commentary.append`, so answers stay grounded; member data is also injected quietly with `session.thinking.append`.
Emergencies spoken by the member trigger ELIA's safety line first. GPT-Live generates its own speech, so this mode shows the orb,
not the Tavus face. Optional: `OPENAI_LIVE_VOICE` (default `marin`), `OPENAI_LIVE_MODEL`. Billing is per second of session
(about $0.05 a minute) plus Claude tokens; 20 starts per IP per hour. `LIVE_MOCK=1` fakes a session for tests.

## Movement (ELIA Movement engine v174)
The movement step runs Prime's own engine package (`elia-movement-engine.zip`, bundled unchanged into the page as `EliaMovement`):
safety first (four questions or the face scan), a starter plan at once, one-tap gates (fitness, time, motivation, place), week 1
steps and movement snacks with the engine's moves and reps, the habit anchor, the first snack with its done moment, and the
score explained (30% steps, 55% cardio, 15% strength; first score after week 1; health minutes for Amber users).
