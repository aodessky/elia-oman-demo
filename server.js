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
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(self), microphone=(self)",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// Light abuse protection for the token endpoint: 20 tokens per IP per hour.
const hits = new Map();
function allowed(ip) {
  const now = Date.now(), win = 3600_000, list = (hits.get(ip) || []).filter((t) => now - t < win);
  if (list.length >= 20) { hits.set(ip, list); return false; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < win)) hits.delete(k);
  return true;
}

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
  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && origin !== `http://${req.headers.host}`) return send(res, 403, { error: "origin" });
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (!allowed(ip)) return send(res, 429, { error: "rate_limited" });
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

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  if (url === "/healthz") return send(res, 200, { ok: true });
  if (url === "/api/dfx/config" && req.method === "GET") return send(res, 200, { enabled: ENABLED });
  if (url === "/api/dfx/token" && req.method === "POST") return issueToken(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  return serveFile(req, res, url);
});
server.listen(PORT, () => console.log(`ELIA demo on :${PORT} · DeepAffex ${ENABLED ? "enabled" : "not configured (set DFX_LICENSE_KEY and DFX_STUDY_ID)"} · API ${API_URL}`));
