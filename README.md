# ELIA by Prime Health (demo)

ELIA's chat demo, with the NuraLogix DeepAffex face scan running inside ELIA's own scan screens.

## Services (`render.yaml`)
| Service | What it runs |
|---|---|
| `elia-oman-demo` (Node web service) | Full demo. `server.js` serves `public/` with cross-origin isolation headers, which the DeepAffex SDK needs. It also issues DeepAffex tokens. |
| `elia-demo` (static site) | The same page without a server, so the on-device scan only. |

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
