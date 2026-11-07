// ELIA demo server.
// - Serves public/ with cross-origin isolation headers (the DeepAffex SDK needs SharedArrayBuffer).
// - POST /api/dfx/token registers a DeepAffex device for this browser and returns a short-lived token pair.
//   The license key stays here, in the DFX_LICENSE_KEY environment variable; it is never sent to the browser.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT) || 10000;
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "public");
const LICENSE_KEY = (process.env.DFX_LICENSE_KEY || "").trim();
const STUDY_ID = (process.env.DFX_STUDY_ID || "").trim();
const API_URL = (process.env.DFX_API_URL || "https://api.deepaffex.ai").replace(/\/+$/, "");
const TOKEN_TTL_S = Number(process.env.DFX_TOKEN_TTL_S) || 3600;
const ENABLED = Boolean(LICENSE_KEY && STUDY_ID);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".wasm": "application/wasm", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".onnx": "application/octet-stream",
};
const ISOLATION = {
  "Cross-Origin-Opener-Policy": "same-origin",
  // credentialless (not require-corp): the page stays cross-origin isolated for the NuraLogix SDK in Chrome, Edge and Firefox,
  // and can still load the Tavus/Daily video call library, which doesn't send CORP headers.
  "Cross-Origin-Embedder-Policy": "credentialless",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(self), microphone=(self)",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// Light abuse protection: per-IP hourly limits per endpoint (tokens 20, Claude 60, Google 120).
const buckets = new Map();
function allowed(ip, name = "dfx", limit = 20) {
  const key = name + "|" + ip, now = Date.now(), win = 3600_000, list = (buckets.get(key) || []).filter((t) => now - t < win);
  if (list.length >= limit) { buckets.set(key, list); return false; }
  list.push(now); buckets.set(key, list);
  if (buckets.size > 20000) for (const [k, v] of buckets) if (!v.some((t) => now - t < win)) buckets.delete(k);
  return true;
}
const clientIp = (req) => (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
const sameOrigin = (req) => { const o = req.headers.origin; return !o || o === `https://${req.headers.host}` || o === `http://${req.headers.host}`; };

function send(res, status, body, headers = {}) {
  const isObj = typeof body === "object" && !Buffer.isBuffer(body);
  res.writeHead(status, { ...ISOLATION, "Content-Type": isObj ? "application/json; charset=utf-8" : headers["Content-Type"] || "text/plain; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}

function deviceType(ua = "") {
  if (/iPhone/.test(ua)) return "IPHONE";
  if (/iPad/.test(ua)) return "IPAD";
  if (/Android/.test(ua)) return "ANDROID_PHONE";
  if (/Windows/.test(ua)) return "WINDOWS";
  if (/Mac OS X|Macintosh/.test(ua)) return "DARWIN";
  return "LINUX";
}

async function readJson(req, max = 4096) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > max) throw new Error("too large"); chunks.push(c); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

async function issueToken(req, res) {
  if (!ENABLED) return send(res, 503, { error: "not_configured" });
  // Only this site's own pages may request tokens.
  if (!sameOrigin(req)) return send(res, 403, { error: "origin" });
  if (!allowed(clientIp(req), "dfx", 20)) return send(res, 429, { error: "rate_limited" });
  let body = {};
  try { body = await readJson(req); } catch { return send(res, 400, { error: "bad_request" }); }
  const id = String(body.id || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64) || crypto.randomUUID();
  try {
    const r = await fetch(`${API_URL}/organizations/licenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Key: LICENSE_KEY, DeviceTypeID: deviceType(req.headers["user-agent"]), Name: "ELIA web",
        Identifier: `elia-web-${id}`, Version: "1.0.0", TokenExpiresIn: TOKEN_TTL_S,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.Token) {
      console.error("DeepAffex register-license failed", r.status, j.Code || "", j.Message || "");
      return send(res, 502, { error: "register_failed", status: r.status, code: j.Code || null });
    }
    if (j.RoleID === "SDK_DEVICE") console.warn("DeepAffex license returned role SDK_DEVICE: measurements may need a user token");
    return send(res, 200, { token: j.Token, refreshToken: j.RefreshToken, studyId: STUDY_ID });
  } catch (e) {
    console.error("DeepAffex unreachable", e.message);
    return send(res, 502, { error: "unreachable" });
  }
}


/* ───────────── Claude (photo recognition, meal estimates, record Q&A) ─────────────
   The page uses Claude through the artifact runtime inside Claude; here it calls this endpoint instead.
   The Anthropic key stays on the server (ANTHROPIC_API_KEY). */
const AI_KEY = (process.env.ANTHROPIC_API_KEY || "").trim();
const AI_MODELS = { quick: process.env.AI_MODEL_QUICK || "claude-haiku-5-5", default: process.env.AI_MODEL_DEFAULT || "claude-sonnet-5-5", complex: process.env.AI_MODEL_DEFAULT || "claude-sonnet-5-5" };
const AI_SYSTEM = "You are part of ELIA, Prime Health's health coaching app. Follow the instructions in the user's message exactly, including any requested output format. You give wellness guidance, not diagnosis.";
async function aiCall(req, res) {
  if (!AI_KEY) return send(res, 503, { error: "not_configured" });
  if (!sameOrigin(req)) return send(res, 403, { error: "origin" });
  if (!allowed(clientIp(req), "ai", 60)) return send(res, 429, { error: "rate_limited" });
  let body;
  try { body = await readJson(req, 12 * 1024 * 1024); } catch { return send(res, 413, { error: "too_large" }); }
  let messages = typeof body.input === "string" ? [{ role: "user", content: body.input }] : Array.isArray(body.input) ? body.input : null;
  if (!messages || !messages.length) return send(res, 400, { error: "bad_request" });
  messages = messages.slice(-14).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 60000) }));
  // merge consecutive turns from the same side
  const merged = [];
  for (const m of messages) { const last = merged[merged.length - 1]; if (last && last.role === m.role) last.content += "\n\n" + m.content; else merged.push({ ...m }); }
  if (merged[0].role !== "user") merged.unshift({ role: "user", content: "(conversation continues)" });
  const images = (Array.isArray(body.images) ? body.images : []).slice(0, 3).filter((i) => i && /^image\/(jpeg|png|webp|gif)$/.test(i.media_type) && typeof i.data === "string" && i.data.length < 6_000_000);
  const lastUser = merged[merged.length - 1];
  if (images.length) lastUser.content = [...images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.media_type, data: i.data } })), { type: "text", text: lastUser.content }];
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": AI_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: AI_MODELS[body.tier] || AI_MODELS.default, max_tokens: 1500, system: AI_SYSTEM, messages: merged }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error("Claude API error", r.status, j.error && j.error.type); return send(res, r.status === 429 ? 429 : 502, { error: r.status === 429 ? "rate_limited" : "upstream" }); }
    const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    return send(res, 200, { text, truncated: j.stop_reason === "max_tokens" });
  } catch (e) { console.error("Claude API unreachable", e.message); return send(res, 502, { error: "unreachable" }); }
}

/* ───────────── Google Calendar (server-side OAuth; works with cross-origin isolation) ─────────────
   1. The page opens /api/google/auth?sid=… in a popup; Google redirects back to /api/google/callback.
   2. The server exchanges the code (client secret stays here) and keeps the token in memory for that sid.
   3. The popup tells the page over a same-origin BroadcastChannel and closes.
   4. The page asks the server for free/busy times and to create events. */
const G_ID = (process.env.GOOGLE_CLIENT_ID || "").trim(), G_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
const G_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.freebusy"];
const gSessions = new Map(); // sid -> { token, exp, email }
const validSid = (sid) => /^[a-zA-Z0-9-]{20,64}$/.test(sid || "");
const redirectUri = (req) => `${req.headers["x-forwarded-proto"] || (req.socket.encrypted ? "https" : "http")}://${req.headers.host}/api/google/callback`;
function gSweep() { const now = Date.now(); for (const [k, v] of gSessions) if (v.exp < now) gSessions.delete(k); }
function googleAuth(req, res, q) {
  if (!G_ID || !G_SECRET) return send(res, 503, "Google Calendar isn't configured on this server.");
  const sid = q.get("sid");
  if (!validSid(sid)) return send(res, 400, "Bad request");
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({ client_id: G_ID, redirect_uri: redirectUri(req), response_type: "code", scope: G_SCOPES.join(" "), state: sid, access_type: "online", include_granted_scopes: "true", prompt: "select_account" }).toString();
  res.writeHead(302, { Location: u.toString(), "Cache-Control": "no-store" }); res.end();
}
function popupPage(res, payload) {
  const html = `<!doctype html><meta charset="utf-8"><title>ELIA · Google Calendar</title><style>body{font:15px system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#0a2342;color:#fff;text-align:center}</style>
<p>${payload.ok ? "Connected. You can close this window." : "Calendar connection didn't complete. You can close this window."}</p>
<script>try{new BroadcastChannel("elia-google").postMessage(${JSON.stringify(payload)})}catch(e){}setTimeout(()=>window.close(),400)</script>`;
  send(res, 200, html, { "Content-Type": "text/html; charset=utf-8" });
}
async function googleCallback(req, res, q) {
  const sid = q.get("state"), code = q.get("code");
  if (!validSid(sid)) return popupPage(res, { ok: false, sid: null, error: "state" });
  if (q.get("error") || !code) return popupPage(res, { ok: false, sid, error: q.get("error") || "no_code" });
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: G_ID, client_secret: G_SECRET, redirect_uri: redirectUri(req), grant_type: "authorization_code" }) });
    const j = await r.json();
    if (!r.ok || !j.access_token) { console.error("Google token exchange failed", r.status, j.error); return popupPage(res, { ok: false, sid, error: j.error || "token" }); }
    let email = null;
    try { const u = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${j.access_token}` } }); email = (await u.json()).email || null; } catch {}
    const granted = String(j.scope || "");
    gSweep(); gSessions.set(sid, { token: j.access_token, exp: Date.now() + Math.min(3500, j.expires_in || 3500) * 1000, email });
    return popupPage(res, { ok: true, sid, email, events: granted.includes("calendar.events"), freebusy: granted.includes("calendar.freebusy") });
  } catch (e) { console.error("Google unreachable", e.message); return popupPage(res, { ok: false, sid, error: "unreachable" }); }
}
async function googleApi(req, res, action) {
  if (!sameOrigin(req)) return send(res, 403, { error: "origin" });
  if (!allowed(clientIp(req), "google", 120)) return send(res, 429, { error: "rate_limited" });
  let b; try { b = await readJson(req, 64 * 1024); } catch { return send(res, 400, { error: "bad_request" }); }
  const s = validSid(b.sid) && gSessions.get(b.sid);
  if (!s || s.exp < Date.now()) return send(res, 401, { error: "not_connected" });
  const H = { Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" };
  try {
    if (action === "freebusy") {
      const r = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", { method: "POST", headers: H, body: JSON.stringify({ timeMin: b.timeMin, timeMax: b.timeMax, timeZone: b.timeZone, items: [{ id: "primary" }] }) });
      const j = await r.json();
      if (!r.ok) return send(res, r.status === 401 ? 401 : 502, { error: "google", detail: j.error && j.error.message });
      return send(res, 200, { busy: (j.calendars && j.calendars.primary && j.calendars.primary.busy) || [], email: s.email });
    }
    if (action === "events") {
      const e = b.event || {};
      const ev = {
        summary: String(e.summary || "ELIA").slice(0, 200), description: String(e.description || "").slice(0, 2000),
        start: { dateTime: e.start, timeZone: b.timeZone }, end: { dateTime: e.end, timeZone: b.timeZone },
        recurrence: Array.isArray(e.recurrence) ? e.recurrence.slice(0, 2).map(String) : undefined,
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] },
        source: { title: "ELIA by Prime Health", url: `https://${req.headers.host}/` },
      };
      const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method: "POST", headers: H, body: JSON.stringify(ev) });
      const j = await r.json();
      if (!r.ok) return send(res, r.status === 401 ? 401 : 502, { error: "google", detail: j.error && j.error.message });
      return send(res, 200, { id: j.id, htmlLink: j.htmlLink });
    }
    if (action === "disconnect") {
      gSessions.delete(b.sid);
      fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(s.token)}`, { method: "POST" }).catch(() => {});
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: "unknown" });
  } catch (e) { console.error("Google API", e.message); return send(res, 502, { error: "unreachable" }); }
}

async function serveFile(req, res, urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) return send(res, 403, "Forbidden");
  try {
    const st = await stat(file);
    if (!st.isFile()) return send(res, 404, "Not found");
    const ext = path.extname(file).toLowerCase();
    const data = await readFile(file);
    const cache = p.startsWith("/dfx-assets/") ? "public, max-age=86400" : "no-cache";
    res.writeHead(200, { ...ISOLATION, "Content-Type": TYPES[ext] || "application/octet-stream", "Content-Length": data.length, "Cache-Control": cache });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    send(res, 404, "Not found");
  }
}

/* ───────────── Voice (Cartesia text-to-speech) ─────────────
   Voice mode reads ELIA's messages aloud with a Cartesia Sonic voice. The key stays here (CARTESIA_API_KEY);
   the page falls back to the browser's own voice when this isn't configured. */
const TTS_KEY = (process.env.CARTESIA_API_KEY || "").trim();
const TTS_MODEL = process.env.CARTESIA_MODEL || "sonic-3.6";
const TTS_VERSION = process.env.CARTESIA_VERSION || "2026-08-14";
// Defaults are Cartesia's recommended voices for agents: Skylar (female, en-US) for ELIA, Daniel (male, en-US) for Sim.
const TTS_VOICES = { elia: process.env.CARTESIA_VOICE_ID || "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4", sim: process.env.CARTESIA_VOICE_ID_SIM || "47c38ca4-5f35-497b-b1a3-415245fb35e1" };
async function ttsCall(req, res) {
  if (!TTS_KEY) return send(res, 503, { error: "not_configured" });
  if (!sameOrigin(req)) return send(res, 403, { error: "origin" });
  if (!allowed(clientIp(req), "tts", 400)) return send(res, 429, { error: "rate_limited" });
  let b;
  try { b = await readJson(req, 16 * 1024); } catch { return send(res, 400, { error: "bad_request" }); }
  const text = String(b.text || "").replace(/\s+/g, " ").trim().slice(0, 900);
  if (!text) return send(res, 400, { error: "bad_request" });
  const lang = ["en", "es", "ar"].includes(b.lang) ? b.lang : "en";
  const who = b.who === "sim" ? "sim" : "elia";
  // A different voice per language is optional (CARTESIA_VOICE_ID_ES, CARTESIA_VOICE_ID_AR); otherwise the same voice speaks every language.
  const voice = (who === "elia" && process.env["CARTESIA_VOICE_ID_" + lang.toUpperCase()]) || TTS_VOICES[who];
  try {
    const r = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cartesia-Version": TTS_VERSION, Authorization: `Bearer ${TTS_KEY}`, "X-API-Key": TTS_KEY },
      body: JSON.stringify({ model_id: TTS_MODEL, transcript: text, voice: { mode: "id", id: voice }, language: lang,
        output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 }, generation_config: { speed: 1.0, volume: 1.0 } }),
    });
    if (!r.ok) { const e = await r.text().catch(() => ""); console.error("Cartesia error", r.status, e.slice(0, 300)); return send(res, r.status === 429 ? 429 : 502, { error: "upstream", status: r.status }); }
    const audio = Buffer.from(await r.arrayBuffer());
    return send(res, 200, audio, { "Content-Type": "audio/mpeg" });
  } catch (e) { console.error("Cartesia unreachable", e.message); return send(res, 502, { error: "unreachable" }); }
}

/* ───────────── Talking avatar (Tavus) ─────────────
   Voice mode shows ELIA as a Tavus face. Two ways to run it:
   - "duplex" (default): Tavus's full pipeline listens all the time, decides turns and lets the member interrupt (Sparrow turn
     detection), and speaks with the Cartesia voice. Its "LLM" is this server (an OpenAI-compatible chat endpoint). Each turn the
     member's words are handed to the member's own page, which runs ELIA's dialog (buttons, meal scoring, Claude) and returns the
     reply; the server streams it back to Tavus. So voice and chat are the same conversation.
   - "echo": the page sends each reply as text and Tavus only animates it (no Tavus listening). Used when TAVUS_MODE=echo.
   TAVUS_API_KEY stays here. The face is TAVUS_FACE_ID, or the account's own face whose name contains "Elia". */
const TAVUS_KEY = (process.env.TAVUS_API_KEY || "").trim();
const TAVUS_API = "https://tavusapi.com/v2";
const TAVUS_MODE = process.env.TAVUS_MODE === "echo" ? "echo" : "duplex";
const TAVUS_LLM_SECRET = (process.env.TAVUS_LLM_SECRET || crypto.randomBytes(24).toString("hex"));
const tavusHeaders = () => ({ "Content-Type": "application/json", "x-api-key": TAVUS_KEY });
let tavusFace = process.env.TAVUS_FACE_ID || null, tavusFaceName = null, tavusPal = process.env.TAVUS_PAL_ID || null;
const tavusKeys = new Map(); // our own key (in the conversational context) -> conversation_id
const tavusConvs = new Map(); // conversation_id -> { sid, turns: [], waiter, replies: Map(turnId -> {resolve}) }
function publicBase(req) { const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim(); return `${proto}://${req.headers.host}`; }
async function tavusSetup(req) {
  if (!tavusFace) {
    const r = await fetch(`${TAVUS_API}/faces?face_type=user&limit=100&verbose=true`, { headers: tavusHeaders() });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`faces ${r.status} ${j.message || ""}`);
    const ok = (j.data || []).filter((f) => f.status === "completed" || f.status === "ready" || !f.status);
    const f = ok.find((x) => /elia/i.test(x.face_name || "")) || ok[0];
    if (!f) throw new Error("no_face");
    tavusFace = f.face_id; tavusFaceName = f.face_name;
    console.log(`Tavus face: ${tavusFaceName} (${tavusFace})`);
  }
  if (!tavusPal) {
    const tts = TTS_KEY ? { tts_engine: "cartesia", api_key: TTS_KEY, external_voice_id: TTS_VOICES.elia } : undefined;
    const bodies = [];
    if (TAVUS_MODE === "duplex") {
      const full = { pal_name: "ELIA", pipeline_mode: "full", default_face_id: tavusFace,
        system_prompt: "You are ELIA, Prime Health's personal health strategist. Speak warmly and briefly. Say exactly what the ELIA app gives you.",
        layers: { llm: { model: "elia", base_url: `${publicBase(req)}/api/tavus/llm`, api_key: TAVUS_LLM_SECRET, speculative_inference: false },
          conversational_flow: { turn_detection_model: "sparrow-2", turn_taking_patience: "medium", pal_interruptibility: "high" },
          perception: { perception_model: "off" }, ...(tts ? { tts } : {}) } };
      bodies.push(full, { ...full, layers: { ...full.layers, tts: undefined } });
    }
    const echo = { pal_name: "ELIA (echo)", pipeline_mode: "echo", default_face_id: tavusFace };
    bodies.push(tts ? { ...echo, layers: { tts } } : echo, echo);
    let last = "";
    for (const body of bodies) {
      const r = await fetch(`${TAVUS_API}/pals`, { method: "POST", headers: tavusHeaders(), body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && (j.pal_id || j.persona_id)) { tavusPal = j.pal_id || j.persona_id; tavusPalMode = body.pipeline_mode; console.log(`Tavus PAL ${tavusPal} (${body.pipeline_mode}${body.layers && body.layers.tts ? ", Cartesia voice" : ""})`); break; }
      last = `${r.status} ${j.message || j.error || ""}`; console.warn("Tavus PAL create failed:", last);
    }
    if (!tavusPal) throw new Error("pal " + last);
  }
}
let tavusPalMode = process.env.TAVUS_PAL_MODE || TAVUS_MODE;
async function tavusStart(req, res) {
  if (!TAVUS_KEY) return send(res, 503, { error: "not_configured" });
  if (!sameOrigin(req)) return send(res, 403, { error: "origin" });
  if (!allowed(clientIp(req), "tavus", 15)) return send(res, 429, { error: "rate_limited" });
  let b = {};
  try { b = await readJson(req, 4096); } catch {}
  try {
    const convKey = "k" + crypto.randomBytes(8).toString("hex");
    if (process.env.TAVUS_MOCK) { const id = "mock-" + convKey; tavusConvs.set(id, { turns: [], waiter: null, replies: new Map(), at: Date.now(), key: convKey }); tavusKeys.set(convKey, id); return send(res, 200, { conversation_id: id, conversation_url: "mock://" + id, face: "mock", mode: "duplex", llmSecret: TAVUS_LLM_SECRET }); }
    await tavusSetup(req);
    const r = await fetch(`${TAVUS_API}/conversations`, { method: "POST", headers: tavusHeaders(), body: JSON.stringify({
      face_id: tavusFace, pal_id: tavusPal, conversation_name: "ELIA voice mode",
      ...(tavusPalMode === "full" || tavusPalMode === "duplex" ? { custom_greeting: String(b.greeting || "").slice(0, 300) || "I'm listening. Go ahead.", conversational_context: `elia_conversation:${convKey} ` + String(b.context || "").slice(0, 2000) } : {}),
      properties: { max_call_duration: 900, participant_left_timeout: 5, participant_absent_timeout: 60, languages: [b.lang === "es" ? "spanish" : b.lang === "ar" ? "arabic" : "english"] } }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.conversation_url) { console.error("Tavus conversation failed", r.status, j.message || j.error || ""); return send(res, 502, { error: "upstream", status: r.status }); }
    const rec = { turns: [], waiter: null, replies: new Map(), at: Date.now(), key: convKey };
    tavusConvs.set(j.conversation_id, rec); tavusKeys.set(convKey, j.conversation_id);
    return send(res, 200, { conversation_id: j.conversation_id, conversation_url: j.conversation_url, face: tavusFaceName, mode: tavusPalMode === "echo" ? "echo" : "duplex" });
  } catch (e) { console.error("Tavus setup failed", e.message); return send(res, 502, { error: e.message === "no_face" ? "no_face" : "setup" }); }
}
/* Tavus → this server: the member just spoke. Hand the words to the member's page, stream ELIA's reply back. */
async function tavusLlm(req, res) {
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${TAVUS_LLM_SECRET}` && req.headers["x-api-key"] !== TAVUS_LLM_SECRET) return send(res, 401, { error: "auth" });
  let b;
  try { b = await readJson(req, 256 * 1024); } catch { return send(res, 400, { error: "bad_request" }); }
  const msgs = Array.isArray(b.messages) ? b.messages : [];
  // Which conversation? Tavus sends the id in a request header (name undocumented), so look for a known id in any header,
  // then in the system context (we put "elia_conversation:<id>" there), then fall back to the only live conversation.
  let convId = null;
  for (const v of Object.values(req.headers)) { const str = String(v); for (const id of tavusConvs.keys()) if (str.includes(id)) { convId = id; break; } if (convId) break; }
  if (!convId) { const sys = msgs.filter((m) => m.role === "system").map((m) => (typeof m.content === "string" ? m.content : "")).join("\n"); const m = sys.match(/elia_conversation:(k[a-f0-9]{16})/); if (m && tavusKeys.has(m[1])) convId = tavusKeys.get(m[1]); }
  if (!convId && tavusConvs.size === 1) convId = [...tavusConvs.keys()][0];
  const c = convId && tavusConvs.get(convId);
  if (!c) { console.warn("Tavus LLM call: no matching conversation; headers", Object.keys(req.headers).join(",")); return send(res, 404, { error: "no_conversation" }); }
  const lastUser = [...msgs].reverse().find((m) => m.role === "user");
  const text = lastUser ? (typeof lastUser.content === "string" ? lastUser.content : (lastUser.content || []).map((x) => x.text || "").join(" ")) : "";
  const turnId = crypto.randomUUID();
  const reply = await new Promise((resolve) => {
    c.replies.set(turnId, { resolve, at: Date.now() });
    c.turns.push({ id: turnId, text: text.replace(/<user_visual_analysis>[\s\S]*?<\/user_visual_analysis>/g, "").trim() });
    if (c.waiter) { const w = c.waiter; c.waiter = null; w(); }
    setTimeout(() => { if (c.replies.has(turnId)) { c.replies.delete(turnId); resolve(""); } }, 25000);
  });
  const id = "chatcmpl-" + turnId.slice(0, 8), created = Math.floor(Date.now() / 1000);
  if (b.stream === false) return send(res, 200, { id, object: "chat.completion", created, model: "elia", choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }] });
  res.writeHead(200, { ...ISOLATION, "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
  const chunk = (delta, fin) => res.write(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model: "elia", choices: [{ index: 0, delta, finish_reason: fin || null }] })}\n\n`);
  chunk({ role: "assistant", content: "" });
  // sentence by sentence, so Tavus can start speaking before the whole reply is out
  for (const part of reply.match(/[^.!?؟。]+[.!?؟。]*\s*/g) || [reply]) chunk({ content: part });
  chunk({}, "stop"); res.write("data: [DONE]\n\n"); res.end();
}
/* page ↔ server: long-poll for the member's words, then post ELIA's reply */
async function tavusTurns(req, res, convId) {
  if (!sameOrigin(req)) return send(res, 403, { error: "origin" });
  const c = tavusConvs.get(convId);
  if (!c) return send(res, 404, { error: "no_conversation" });
  if (!c.turns.length) await new Promise((r) => { c.waiter = r; const t = setTimeout(() => { if (c.waiter === r) { c.waiter = null; r(); } }, 20000); req.on("close", () => { clearTimeout(t); if (c.waiter === r) { c.waiter = null; r(); } }); });
  const turns = c.turns.splice(0); return send(res, 200, { turns });
}
async function tavusReply(req, res, convId) {
  if (!sameOrigin(req)) return send(res, 403, { error: "origin" });
  const c = tavusConvs.get(convId);
  if (!c) return send(res, 404, { error: "no_conversation" });
  let b = {};
  try { b = await readJson(req, 64 * 1024); } catch { return send(res, 400, { error: "bad_request" }); }
  const w = c.replies.get(String(b.turn || ""));
  if (w) { c.replies.delete(String(b.turn)); w.resolve(String(b.text || "").slice(0, 1500)); }
  return send(res, 200, { ok: true });
}
async function tavusEnd(req, res) {
  let b = {};
  try { b = await readJson(req, 4096); } catch {}
  const id = String(b.conversation_id || "");
  if (!TAVUS_KEY || !tavusConvs.has(id)) return send(res, 200, { ok: true });
  const c = tavusConvs.get(id); for (const w of c.replies.values()) w.resolve(""); if (c.waiter) c.waiter(); tavusKeys.delete(c.key); tavusConvs.delete(id);
  try { await fetch(`${TAVUS_API}/conversations/${encodeURIComponent(id)}/end`, { method: "POST", headers: tavusHeaders() }); } catch {}
  return send(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  if (url === "/healthz") return send(res, 200, { ok: true });
  const u = new URL(url, "http://x"), p = u.pathname;
  if (p === "/api/dfx/config" && req.method === "GET") return send(res, 200, { enabled: ENABLED });
  if (p === "/api/dfx/token" && req.method === "POST") return issueToken(req, res);
  if (p === "/api/config" && req.method === "GET") return send(res, 200, { dfx: ENABLED, ai: Boolean(AI_KEY), google: Boolean(G_ID && G_SECRET), tts: Boolean(TTS_KEY), tavus: Boolean(TAVUS_KEY) });
  if (p === "/api/ai" && req.method === "POST") return aiCall(req, res);
  if (p === "/api/tts" && req.method === "POST") return ttsCall(req, res);
  if (p === "/api/tavus/start" && req.method === "POST") return tavusStart(req, res);
  if (p === "/api/tavus/end" && req.method === "POST") return tavusEnd(req, res);
  if (p === "/api/tavus/llm/chat/completions" && req.method === "POST") return tavusLlm(req, res);
  { const m = p.match(/^\/api\/tavus\/turns\/([A-Za-z0-9_-]+)$/); if (m && req.method === "GET") return tavusTurns(req, res, m[1]); }
  { const m = p.match(/^\/api\/tavus\/reply\/([A-Za-z0-9_-]+)$/); if (m && req.method === "POST") return tavusReply(req, res, m[1]); }
  if (p === "/api/google/auth" && req.method === "GET") return googleAuth(req, res, u.searchParams);
  if (p === "/api/google/callback" && req.method === "GET") return googleCallback(req, res, u.searchParams);
  if (p.startsWith("/api/google/") && req.method === "POST") return googleApi(req, res, p.slice("/api/google/".length));
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  return serveFile(req, res, url);
});
server.listen(PORT, () => console.log(`ELIA demo on :${PORT} · DeepAffex ${ENABLED ? "enabled" : "not configured (set DFX_LICENSE_KEY and DFX_STUDY_ID)"} · API ${API_URL} · Claude ${AI_KEY ? "enabled" : "not configured (ANTHROPIC_API_KEY)"} · Google Calendar ${G_ID && G_SECRET ? "enabled" : "not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)"} · Voice ${TTS_KEY ? "Cartesia " + TTS_MODEL : "browser (CARTESIA_API_KEY not set)"} · Avatar ${TAVUS_KEY ? "Tavus" : "off (TAVUS_API_KEY not set)"}`));
