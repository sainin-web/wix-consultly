/**
 * Refresh / navigate-away during an active chat ends the session IMMEDIATELY
 * (no grace period, billed from server timestamps).
 *
 * `pagehide` fires on refresh, tab close and navigation — but NOT on a network
 * drop — so this is exactly how the server tells the two apart. The beacon is
 * a simple text/plain POST (no CORS preflight, survives unload) to the
 * idempotent end-session endpoint; the socket "endChat" is emitted as well as
 * a best-effort second path.
 */
import { socket } from "../components/Sokect-io/SokectConfig";

const BACKEND = process.env.REACT_APP_BACKEND_HOST;

export function sendEndSessionBeacon({ transactionId, endedBy, userId, consultantId, shopId }) {
  if (!transactionId || !endedBy) return false;
  const url = `${BACKEND}/api/chat/end-session/${transactionId}`;
  const body = JSON.stringify({ endedBy, endReason: "page_closed" });
  let sent = false;
  try {
    if (navigator.sendBeacon) {
      sent = navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
    }
  } catch (err) {
    sent = false;
  }
  if (!sent) {
    try {
      fetch(url, { method: "POST", body, headers: { "Content-Type": "text/plain" }, keepalive: true });
      sent = true;
    } catch (err) {
      sent = false;
    }
  }
  try {
    socket.emit("endChat", { transactionId, userId, consultantId, shopId });
  } catch (err) {
    // socket may already be tearing down
  }
  console.log("[CHAT] page closing → end-session beacon", { transactionId, sent });
  return sent;
}

/**
 * Hook helper: call inside a useEffect with the current timer snapshot.
 * Returns the cleanup function.
 */
export function attachEndOnPageHide(getSession) {
  const handler = () => {
    const s = getSession();
    if (s?.isRunning && s.transactionId) sendEndSessionBeacon(s);
  };
  window.addEventListener("pagehide", handler);
  window.addEventListener("beforeunload", handler);
  return () => {
    window.removeEventListener("pagehide", handler);
    window.removeEventListener("beforeunload", handler);
  };
}
