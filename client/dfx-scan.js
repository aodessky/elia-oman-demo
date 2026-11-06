// NuraLogix DeepAffex face scan, driven from ELIA's own scan UI.
// Exposes window.EliaDfx: { enabled, ready, run(hooks) }. The page decides when to use it and draws everything itself.
import { Measurement, faceTrackerState, constraintStatus } from "@nuralogix.ai/anura-web-core-sdk";
import helpers from "@nuralogix.ai/anura-web-core-sdk/helpers";
const { CameraController } = helpers;

const api = { enabled: false, reason: "", ready: null, run };
window.EliaDfx = api;

api.ready = (async () => {
  if (!window.crossOriginIsolated) { api.reason = "not_isolated"; return false; }
  try {
    const r = await fetch("/api/dfx/config", { cache: "no-store" });
    const j = r.ok ? await r.json() : {};
    api.enabled = Boolean(j.enabled);
    if (!api.enabled) api.reason = "not_configured";
  } catch { api.reason = "no_server"; }
  return api.enabled;
})();

function deviceId() {
  try {
    let id = localStorage.getItem("elia-dfx-device");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("elia-dfx-device", id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

/** The DeepAffex region a device token belongs to (e.g. "na-east"), from its payload. */
function tokenRegion(token) {
  try {
    const p = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const r = p.rgn || p.Region || p.region;
    return typeof r === "string" && /^[a-z0-9-]{2,24}$/.test(r) ? r : null;
  } catch { return null; }
}

/** Read every point in a DeepAffex result as plain numbers. */
export function parseResults(r) {
  const m = r.Multiplier || 1, points = {};
  for (const [k, p] of Object.entries(r.Channels || {})) {
    if (!p || !Array.isArray(p.Data) || !p.Data.length) continue;
    points[k] = { value: p.Data[0] / m, notes: p.Notes || [] };
  }
  return { points, final: Boolean(r.StatusID), status: r.StatusID || null, error: r.Error && r.Error.Code !== "OK" ? r.Error : null, measurementId: r.MeasurementID };
}

/**
 * Run one DeepAffex measurement.
 * hooks: {
 *   mediaElement: HTMLDivElement,          where the SDK draws the camera
 *   demographics(): object,                age, sex, height, weight… (DeepAffex codes)
 *   onStage(stage, info),                  "token" | "assets" (info: pct) | "camera" | "align" | "measuring" | "analyzing"
 *   onConstraint(feedback, status),        SDK constraint feedback (GOOD | WARN | ERROR)
 *   onFace(detected),
 *   onProgress(pct),
 *   onLive(parsed),                        intermediate results
 *   onFinal(parsed),                       final results
 *   onError(code, detail)                  "token" | "assets" | "prepare" | "camera" | "measure" | "socket" | "results"
 * }
 * Returns { cancel() }.
 */
function run(h) {
  let m = null, cam = null, cancelled = false, started = false, goodSince = 0, finished = false, measuringSince = 0, isPrepared = false;
  const fail = async (code, detail) => { if (cancelled || finished) return; finished = true; await cleanup(); h.onError(code, detail); };
  async function cleanup() {
    try { if (m) await m.stopTracking(); } catch {}
    try { if (cam) cam.stop(); } catch {}
    try { if (m) await m.destroy(); } catch {}
    m = null; cam = null;
  }
  async function begin() {
    if (started || cancelled || finished || !m) return;
    started = true;
    try {
      m.setDemographics(h.demographics ? h.demographics() : {});
      const id = await m.startMeasurement(false);
      if (!id) { started = false; return fail("measure", "no_measurement_id"); }
      measuringSince = performance.now();
      h.onStage("measuring");
    } catch (e) { started = false; fail("measure", String(e && e.message || e)); }
  }
  (async () => {
    h.onStage("token");
    let tok;
    try {
      const r = await fetch("/api/dfx/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deviceId() }) });
      tok = await r.json().catch(() => ({}));
      if (!r.ok || !tok.token) return fail("token", tok.error || r.status);
    } catch (e) { return fail("token", "network"); }
    if (cancelled) return;
    // The SDK talks to the regional DeepAffex API straight from the browser. NuraLogix must allow this site's
    // domain there (CORS). Check once up front, so a blocked domain falls back at once instead of waiting forever.
    const region = tokenRegion(tok.token);
    if (region) {
      try {
        await fetch(`https://api.${region}.deepaffex.ai/studies/sdkconfig`, { headers: { Authorization: `Bearer ${tok.token}` }, cache: "no-store" });
      } catch { return fail("prepare", "domain_not_allowed"); }
      if (cancelled) return;
    }
    try {
      m = await Measurement.init({ mediaElement: h.mediaElement, assetFolder: "/dfx-assets", metrics: false, mirrorVideo: true, displayMediaStream: true });
    } catch (e) { return fail("assets", String(e && e.message || e)); }
    m.on.bytesDownloaded = (bytes, total) => { if (total) h.onStage("assets", Math.min(100, Math.round((100 * bytes) / total))); };
    m.on.faceTrackerStateChanged = (st) => { if (st === faceTrackerState.READY && !cancelled) h.onStage("align"); };
    m.on.constraintsUpdated = (fb, status) => {
      if (cancelled || finished) return;
      h.onConstraint(fb, status);
      if (status === constraintStatus.GOOD) { goodSince = goodSince || performance.now(); }
      else goodSince = 0;
      if (status === constraintStatus.ERROR && started) {
        // The SDK failed this measurement (moved away, light changed…). Re-arm and wait for a good position again.
        started = false; goodSince = 0;
        (async () => { try { await m.stopTracking(); await m.startTracking(); } catch {} h.onStage("align", "restart"); })();
      }
    };
    m.on.facialLandmarksUpdated = (d) => {
      if (cancelled || finished) return;
      const det = Boolean(d && d.face && d.face.detected);
      h.onFace(det);
      if (started && typeof d.percentCompleted === "number") {
        h.onProgress(d.percentCompleted);
        if (d.percentCompleted >= 100) h.onStage("analyzing");
      }
      if (!started && isPrepared && det && goodSince && performance.now() - goodSince > 1200) begin();
    };
    m.on.resultsReceived = (r) => {
      if (cancelled || finished) return;
      const p = parseResults(r);
      if (p.final) { finished = true; cleanup().then(() => h.onFinal(p)); }
      else h.onLive(p);
    };
    m.on.error = (cat, data) => {
      if (cat === "WEB_SOCKET") return fail("socket", data && (data.reason || data.type));
      if (cat === "ASSET_DOWNLOAD") return fail("assets", "download");
      console.warn("DeepAffex", cat, data);
    };
    try {
      h.onStage("assets", 0);
      const okA = await m.downloadAssets();
      if (!okA) return fail("assets", "download");
    } catch (e) { return fail("assets", String(e && e.message || e)); }
    if (cancelled) return cleanup();
    // Validate the token while the camera opens, so the member sees themselves sooner.
    const prepared = Promise.race([
      m.prepare(tok.token, tok.refreshToken, tok.studyId).then((ok) => ok, () => false),
      new Promise((res) => setTimeout(() => res(false), 20_000)),
    ]);
    h.onStage("camera");
    try {
      cam = CameraController.init();
      const perm = await cam.requestPermission();
      if (!perm.success) return fail("camera", perm.error || "denied");
      await cam.list();
      const ok = (await cam.start(1280, 720, "user")) || (await cam.start(640, 360, "user"));
      if (!ok || !cam.cameraStream) return fail("camera", "start");
      await m.setMediaStream(cam.cameraStream);
      m.setObjectFit("cover");
      await m.startTracking();
    } catch (e) { return fail("camera", String(e && e.message || e)); }
    if (!(await prepared)) { if (window.__dfxKeepCameraOnPrepareFail) { h.onStage("align"); return; } return fail("prepare", "invalid_token_or_study"); }
    isPrepared = true;
    // Results normally arrive within ~20 s of the last chunk; give up after 90 s of measuring without a final result.
    const watchdog = setInterval(() => {
      if (cancelled || finished) return clearInterval(watchdog);
      if (started && measuringSince && performance.now() - measuringSince > 90_000) { clearInterval(watchdog); fail("results", "timeout"); }
    }, 2000);
  })();
  return { async cancel() { cancelled = true; await cleanup(); } };
}
