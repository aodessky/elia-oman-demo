// OpenAI GPT-Live for ELIA's voice mode: full-duplex speech over WebRTC, voice only (no avatar).
// window.EliaLive = { enabled, ready, start(hooks, {lang, context}), stop(), setMic(on), think(text), say(text), active }
// Client delegation: when the model hands a question to the client, hooks.onDelegate(text) answers it (Claude, member data),
// and the answer goes back as commentary for the model to speak.
const api = { enabled: false, ready: null, start, stop, setMic, think, say, active: false, mock: false };
window.EliaLive = api;
api.ready = (async () => {
  try { const r = await fetch("/api/config", { cache: "no-store" }); const j = r.ok ? await r.json() : {}; api.enabled = Boolean(j.live); }
  catch { api.enabled = false; }
  return api.enabled;
})();

let pc = null, dc = null, mic = null, hooks = {}, userBuf = "", lastUser = "", botBuf = "", talkT = 0, started = false, sessionId = null, n = 0;
const send = (ev) => { if (!dc || dc.readyState !== "open") return false; dc.send(JSON.stringify({ event_id: `elia-${Date.now()}-${++n}`, ...ev })); return true; };
const clip = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 1600); // keeps appends inside the 500-token limit

async function start(h, opts = {}) {
  hooks = h || {}; userBuf = ""; lastUser = ""; botBuf = ""; started = false;
  const body = { lang: opts.lang || "en", context: opts.context || "" };
  // mock (tests): no WebRTC, a fake data channel driven by respond()
  const probe = await fetch("/api/config", { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
  if (!probe.live) throw new Error("not_configured");
  mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  pc = new RTCPeerConnection();
  for (const tr of mic.getAudioTracks()) pc.addTrack(tr, mic);
  pc.ontrack = (e) => { if (e.track.kind === "audio") hooks.onAudio && hooks.onAudio(e.streams[0] || new MediaStream([e.track])); };
  pc.onconnectionstatechange = () => { if (!pc) return; if (["failed", "closed", "disconnected"].includes(pc.connectionState)) { const why = pc.connectionState; stop(); hooks.onClosed && hooks.onClosed(why); } };
  dc = pc.createDataChannel("oai-events");
  dc.onmessage = (e) => { let ev = null; try { ev = JSON.parse(e.data); } catch { return; } onEvent(ev); };
  const offer = await pc.createOffer({ offerToReceiveAudio: true });
  await pc.setLocalDescription(offer);
  await new Promise((res) => { if (pc.iceGatheringState === "complete") return res(); const t = setTimeout(res, 2500); pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } }; });
  const r = await fetch("/api/live/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, sdp: pc.localDescription.sdp }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { stop(); throw new Error(j.error || "start_failed"); }
  sessionId = j.id; api.active = true;
  if (j.mock) { api.mock = true; mockUp(); return j; }
  await pc.setRemoteDescription({ type: "answer", sdp: j.sdp });
  return j;
}
function onEvent(ev) {
  const t = ev.type || "";
  if (t === "session.started") { started = true; hooks.onReady && hooks.onReady(); return; }
  if (t === "session.input_transcript.delta") { userBuf += ev.delta || ev.text || ""; hooks.onUserText && hooks.onUserText(userBuf); if (hooks.onEmergency && hooks.onEmergency(userBuf)) {} return; }
  if (t === "session.input_transcript.done" || t === "session.input_transcript.completed") { if (userBuf.trim()) lastUser = userBuf.trim(); userBuf = ""; return; }
  if (t === "session.output_transcript.delta") { botBuf += ev.delta || ev.text || ""; if (userBuf.trim()) { lastUser = userBuf.trim(); userBuf = ""; } talking(true); clearTimeout(talkT); talkT = setTimeout(() => talking(false), 1400); hooks.onBotText && hooks.onBotText(botBuf); return; }
  if (t === "session.output_transcript.done" || t === "session.output_transcript.completed") { botBuf = ""; return; }
  if (t === "session.delegation.created" && (!ev.delegation || ev.delegation.target === "client")) { delegate(ev.delegation && ev.delegation.id); return; }
  if (t === "session.closed") { const why = ev.reason || "closed"; stop(); hooks.onClosed && hooks.onClosed(why); return; }
  if (t === "error") { hooks.onError && hooks.onError((ev.error && ev.error.message) || "error"); return; }
}
let talkingNow = false;
function talking(on) { if (talkingNow === on) return; talkingNow = on; if (on) hooks.onStarted && hooks.onStarted("speaking"); else hooks.onStopped && hooks.onStopped(); }
const pending = new Set();
async function delegate(id) {
  const q = (userBuf.trim() || lastUser || "").trim(); userBuf = ""; if (q) lastUser = q;
  pending.add(id);
  let text = "";
  try { text = await (hooks.onDelegate ? hooks.onDelegate(q) : Promise.resolve("")); } catch { text = ""; }
  if (!pending.has(id) || !api.active) return; pending.delete(id);
  if (text) send({ type: "session.commentary.append", delegation_id: id || null, content: clip(text) });
}
// quiet context the model can use (member data) and things to say now (safety line)
function think(text) { return send({ type: "session.thinking.append", delegation_id: null, content: clip(text) }); }
function say(text) { return send({ type: "session.commentary.append", delegation_id: null, content: clip(text) }); }
function setMic(on) { if (mic) mic.getAudioTracks().forEach((tr) => { tr.enabled = !!on; }); if (dc && dc.readyState === "open" && !api.mock) send({ type: "session.input_audio.mute", muted: !on }); }
function stop() {
  const was = api.active; api.active = false; api.mock = false; pending.clear(); clearTimeout(talkT); talkingNow = false;
  try { if (dc && dc.readyState === "open") dc.send(JSON.stringify({ type: "session.close" })); } catch {}
  try { if (mic) mic.getTracks().forEach((tr) => tr.stop()); } catch {}
  try { if (pc) pc.close(); } catch {}
  pc = null; dc = null; mic = null; sessionId = null; userBuf = ""; botBuf = "";
  return was;
}
/* tests: a fake channel. respond(text) plays a member turn; the fake model delegates every turn and "speaks" the commentary. */
function mockUp() {
  const chan = { readyState: "open", send: (s) => { const ev = JSON.parse(s); if (ev.type === "session.commentary.append") { const txt = ev.content; setTimeout(() => { onEvent({ type: "session.output_transcript.delta", delta: txt }); setTimeout(() => onEvent({ type: "session.output_transcript.done" }), 300); }, 50); } } };
  dc = chan; setTimeout(() => onEvent({ type: "session.started" }), 80);
  api.respond = (text) => { onEvent({ type: "session.input_transcript.delta", delta: text }); onEvent({ type: "session.input_transcript.done" }); onEvent({ type: "session.delegation.created", delegation: { id: "d" + (++n), type: "delegation", target: "client" } }); };
}
addEventListener("pagehide", () => { if (api.active) stop(); });
