/**
 * Calls ALWAYS run in a dedicated top-level browser tab, never inside the Wix
 * section/iframe (embedded pages get unreliable microphone/camera/WebRTC access).
 *
 * Popup-blocker rule: window.open() must run synchronously inside the click
 * handler. So a caller/acceptor first RESERVES the tab (reserveCallTab), then
 * does its async API work, then NAVIGATES the reserved tab (navigateCallTab)
 * or closes it on failure (closeReservedTab).
 *
 * The call tab and the original Wix page talk through a BroadcastChannel
 * (localStorage "storage" events as fallback) — heartbeat + lifecycle — on top
 * of the server socket events both tabs already receive.
 */
export const CALL_TAB_NAME = "consultly_call";
const CHANNEL = "consultly-call";
const STORAGE_KEY = "consultly_call_msg";
let lastTab = null;

const instanceParam = () => {
  try {
    return new URLSearchParams(window.location.search).get("instance") || localStorage.getItem("wix_instance") || "";
  } catch (e) { return ""; }
};

/** Absolute URL of the standalone call page. */
/*
 * Identity travels in the URL. Browsers partition localStorage for third-party
 * iframes (the Wix embed), so a top-level tab of the same origin cannot read
 * what the embedded page stored. The server verifies on every request that
 * uid is a participant of callId, so the URL grants nothing by itself.
 */
export function buildCallUrl({ callId, as, uid, preparing } = {}) {
  const q = new URLSearchParams();
  if (callId) q.set("callId", callId);
  if (as) q.set("as", as);
  if (uid) q.set("uid", uid);
  if (preparing) q.set("preparing", "1");
  const inst = instanceParam();
  if (inst) q.set("instance", inst);
  return `${window.location.origin}/video/calling/page?${q.toString()}`;
}

/** Call synchronously inside the click gesture. Returns the tab or null (blocked). */
export function reserveCallTab(as, uid) {
  try {
    const w = window.open(buildCallUrl({ as, uid, preparing: true }), CALL_TAB_NAME);
    if (!w) { console.warn("[CALL TAB] popup blocked"); return null; }
    lastTab = w;
    try { w.focus(); } catch (e) { /* ignore */ }
    console.log("[CALL TAB] reserved");
    return w;
  } catch (e) {
    console.warn("[CALL TAB] reserve failed", e?.message);
    return null;
  }
}

/** Point a reserved tab at the real call. */
export function navigateCallTab(tab, { callId, as, uid }) {
  if (!tab || tab.closed) return false;
  try {
    tab.location.href = buildCallUrl({ callId, as, uid });
    try { tab.focus(); } catch (e) { /* ignore */ }
    console.log("[CALL TAB] navigated", { callId, as });
    return true;
  } catch (e) {
    console.warn("[CALL TAB] navigate failed", e?.message);
    return false;
  }
}

export function closeReservedTab(tab) {
  try { if (tab && !tab.closed) tab.close(); } catch (e) { /* ignore */ }
}

/** Rejoin/switch: focus the existing call tab, or open the call page (needs a click gesture). */
export function focusOrOpenCallTab({ callId, as, uid }) {
  if (lastTab && !lastTab.closed) {
    try { lastTab.focus(); return lastTab; } catch (e) { /* fall through */ }
  }
  try {
    const w = window.open(buildCallUrl({ callId, as, uid }), CALL_TAB_NAME);
    if (w) { lastTab = w; try { w.focus(); } catch (e) { /* ignore */ } }
    return w || null;
  } catch (e) { return null; }
}

/* ── tab ↔ page messaging ─────────────────────────────────────────────── */
let bc = null;
function channel() {
  if (bc) return bc;
  try { bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null; } catch (e) { bc = null; }
  return bc;
}

/** From the call tab: { type: "alive" | "connected" | "ended" | "gone", callId, ... } */
export function announceCall(msg) {
  const m = { ...msg, at: Date.now() };
  const c = channel();
  if (c) { try { c.postMessage(m); return; } catch (e) { /* fall back */ } }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch (e) { /* ignore */ }
}

/** From the original page. Returns an unsubscribe function. */
export function subscribeCallTab(cb) {
  const c = channel();
  const onBc = (e) => cb(e.data || {});
  const onStorage = (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try { cb(JSON.parse(e.newValue)); } catch (err) { /* ignore */ }
  };
  if (c) c.addEventListener("message", onBc); else window.addEventListener("storage", onStorage);
  return () => { if (c) c.removeEventListener("message", onBc); else window.removeEventListener("storage", onStorage); };
}
