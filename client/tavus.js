// Tavus talking avatar for ELIA's voice mode (echo mode, over a Daily call object; no Daily UI).
// Exposes window.EliaTavus = { enabled, ready, start(hooks), say(text), interrupt(), stop() }.
// The page keeps listening with its own speech recognition; Tavus only renders ELIA speaking the text it is sent.
import Daily from "@daily-co/daily-js";

const api = { enabled: false, ready: null, start, say, interrupt, stop, active: false, mode: null };
window.EliaTavus = api;
api.ready = (async () => {
  try { const r = await fetch("/api/config", { cache: "no-store" }); const j = r.ok ? await r.json() : {}; api.enabled = Boolean(j.tavus); }
  catch { api.enabled = false; }
  return api.enabled;
})();

let call = null, conv = null, hooks = {}, n = 0;
const echoMsg = (text) => ({ message_type: "conversation", event_type: "conversation.echo", conversation_id: conv.conversation_id,
  properties: { modality: "text", text, inference_id: `elia-${Date.now()}-${++n}`, done: true } });

/**
 * hooks: onVideo(track), onAudio(track), onStarted(), onStopped(), onGone(), onError(code)
 * Resolves when the call is joined; onVideo fires once the face has joined the room and is ready to speak.
 */
async function start(h, opts = {}) {
  hooks = h || {};
  const r = await fetch("/api/tavus/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ greeting: opts.greeting || "", lang: opts.lang || "en", context: opts.context || "" }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.conversation_url) throw new Error(j.error || "start_failed");
  conv = j; api.active = true;
  call = Daily.createCallObject({ audioSource: false, videoSource: false, subscribeToTracksAutomatically: true });
  call.on("track-started", (e) => {
    if (!e.participant || e.participant.local) return;
    if (e.track.kind === "video") hooks.onVideo && hooks.onVideo(e.track);
    if (e.track.kind === "audio") hooks.onAudio && hooks.onAudio(e.track);
  });
  call.on("app-message", (e) => {
    const d = (e && e.data) || {};
    if (d.event_type === "conversation.replica.started_speaking") hooks.onStarted && hooks.onStarted();
    else if (d.event_type === "conversation.replica.stopped_speaking") hooks.onStopped && hooks.onStopped();
  });
  call.on("participant-left", (e) => { if (e.participant && !e.participant.local) hooks.onGone && hooks.onGone(); });
  call.on("error", (e) => hooks.onError && hooks.onError((e && e.errorMsg) || "call_error"));
  // duplex: Tavus listens through the member's microphone; echo: nothing is sent
  const duplex = j.mode === "duplex";
  if (duplex) { try { await call.setInputDevicesAsync({ audioSource: true }); } catch {} }
  await call.join({ url: j.conversation_url, startVideoOff: true, startAudioOff: !duplex });
  api.mode = j.mode; api.conversationId = j.conversation_id;
  if (duplex) pollTurns(j.conversation_id);
  return j;
}
/* duplex: the member's words arrive from the server (Tavus heard them); ELIA's page answers and posts the reply back */
async function pollTurns(id) {
  while (conv && conv.conversation_id === id) {
    try {
      const r = await fetch(`/api/tavus/turns/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (r.status === 404) break;
      const j = r.ok ? await r.json() : { turns: [] };
      for (const turn of j.turns || []) {
        let text = "";
        try { text = await (hooks.onTurn ? hooks.onTurn(turn.text) : Promise.resolve("")); } catch (e) { text = ""; }
        fetch(`/api/tavus/reply/${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turn: turn.id, text }) }).catch(() => {});
      }
    } catch { await new Promise((r) => setTimeout(r, 800)); }
  }
}
function setMic(on) { if (call) call.setLocalAudio(!!on); }
api.setMic = setMic;
/* Text as if the member had said it (typing during a call, and tests). Full pipeline only. */
function respond(text) { if (!call || !conv) return false; call.sendAppMessage({ message_type: "conversation", event_type: "conversation.respond", conversation_id: conv.conversation_id, properties: { text: String(text) } }, "*"); return true; }
api.respond = respond;
function say(text) { if (!call || !conv) return false; call.sendAppMessage(echoMsg(text), "*"); return true; }
function interrupt() { if (call && conv) call.sendAppMessage({ message_type: "conversation", event_type: "conversation.interrupt", conversation_id: conv.conversation_id }, "*"); }
async function stop() {
  const c = call, id = conv && conv.conversation_id; call = null; conv = null; api.active = false; hooks = {};
  try { if (c) { await c.leave(); await c.destroy(); } } catch {}
  if (id) fetch("/api/tavus/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: id }), keepalive: true }).catch(() => {});
}
addEventListener("pagehide", () => { if (conv) stop(); });
