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
