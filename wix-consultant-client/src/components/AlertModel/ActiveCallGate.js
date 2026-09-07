import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { useWixUser } from "../../useContext/WixUserContext";
import { getCustomerId } from "../../utils/wixStorage";
import { focusOrOpenCallTab, subscribeCallTab } from "../../utils/callTab";

const BACKEND = process.env.REACT_APP_BACKEND_HOST;
const HEARTBEAT_STALE_MS = 6000;
const LIFECYCLE = ["accepted", "connected", "ended", "failed", "cancelled", "missed", "rejected", "resumed"];

const css = `
.acg-backdrop{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(17,24,39,.45)}
.acg-card{width:100%;max-width:420px;padding:20px;background:#fff;border-radius:12px;box-shadow:0 16px 40px -8px rgba(16,24,40,.25);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111318}
.acg-title{margin:0 0 6px;font-size:17px;font-weight:650}
.acg-text{margin:0 0 6px;font-size:13.5px;line-height:1.55;color:#666b78}
.acg-meta{margin:10px 0 16px;padding:10px 12px;border-radius:9px;background:#f8f9fb;font-size:13px}
.acg-meta b{display:block;font-size:14px;color:#111318}
.acg-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.acg-btn{padding:9px 14px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}
.acg-ghost{border:1px solid #d1d5db;background:#fff;color:#111318}
.acg-primary{border:0;background:#ff6b35;color:#fff}
.acg-btn:disabled{opacity:.55;cursor:not-allowed}
.acg-err{margin-top:8px;font-size:12.5px;color:#b42318}
.acg-pill{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:10px;max-width:calc(100% - 24px);padding:8px 8px 8px 14px;background:#111318;color:#fff;border-radius:999px;box-shadow:0 10px 30px -8px rgba(0,0,0,.45);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;font-weight:600}
.acg-dot{width:8px;height:8px;border-radius:50%;background:#12b76a;box-shadow:0 0 0 0 rgba(18,183,106,.5);animation:acgPulse 1.4s infinite}
@keyframes acgPulse{0%{box-shadow:0 0 0 0 rgba(18,183,106,.5)}100%{box-shadow:0 0 0 8px rgba(18,183,106,0)}}
.acg-pill button{padding:6px 11px;border-radius:999px;border:0;font:inherit;font-size:12.5px;cursor:pointer}
.acg-switch{background:#fff;color:#111318}
.acg-end{background:#b42318;color:#fff}
@media (max-width:600px){.acg-pill span.acg-label{display:none}}
`;

/**
 * Original page (storefront or consultant dashboard) companion of the call tab.
 * The DB decides whether a call is live; the call tab's heartbeat says whether
 * it is still open:
 *   - heartbeat present → compact "call in progress" pill (Switch / End)
 *   - no heartbeat (tab closed/crashed, page refreshed) → Rejoin / End modal
 * Nothing here navigates this page; the call always runs in its own tab.
 */
export default function ActiveCallGate({ userId: userIdProp, role = "user" }) {
  const { user } = useWixUser();
  const userId = userIdProp || user?.wixDbId || getCustomerId();
  const callEvent = useSelector((s) => s.socket.callEvent);
  const [call, setCall] = useState(null);
  const [live, setLive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await axios.get(`${BACKEND}/api/call/active-session/${userId}`);
      const active = data?.hasActiveCall && ["accepted", "connecting", "active"].includes(data.call?.status);
      setCall(active ? data.call : null);
      if (active) console.log("[CALL SESSION] live call found from original page", data.call.callId, data.call.status);
    } catch (err) { /* keep current state */ }
  }, [userId]);

  useEffect(() => { check(); }, [check]);
  // While a call exists, poll the server flag: BroadcastChannel/localStorage are
  // partitioned for the Wix embed, so the server is the reliable "tab open" signal.
  useEffect(() => {
    if (!call) return;
    const i = setInterval(check, 5000);
    return () => clearInterval(i);
  }, [call, check]);
  useEffect(() => { if (callEvent && LIFECYCLE.includes(callEvent.type)) check(); }, [callEvent, check]);

  useEffect(() => subscribeCallTab((m) => {
    if (!m?.callId) return;
    if (m.type === "alive" || m.type === "connected") setLive({ callId: String(m.callId), at: Date.now(), status: m.status });
    else if (m.type === "gone") setLive(null);
    else if (m.type === "ended") { setLive(null); setCall(null); check(); }
  }), [check]);

  useEffect(() => {
    const i = setInterval(() => setLive((l) => (l && Date.now() - l.at > HEARTBEAT_STALE_MS ? null : l)), 2000);
    return () => clearInterval(i);
  }, []);

  if (!call || !userId) return null;

  const inTab = Boolean(call.tabAttached) || (live && live.callId === String(call.callId));
  const who = call.participant?.fullname || (role === "consultant" ? "Client" : "Consultant");
  const kind = call.callType === "video" ? "Video call" : "Audio call";

  const rejoin = () => {
    setError("");
    const w = focusOrOpenCallTab({ callId: call.callId, as: role, uid: userId });
    if (!w) setError("Your browser blocked the call tab. Allow pop-ups for this site and try again.");
  };
  const end = async () => {
    setBusy(true);
    try { await axios.post(`${BACKEND}/api/call/end-session/${call.callId}`, { userId }); } catch (err) { /* idempotent */ }
    finally { setBusy(false); setCall(null); setLive(null); }
  };

  if (inTab) {
    return (
      <>
        <style>{css}</style>
        <div className="acg-pill" role="status">
          <span className="acg-dot" aria-hidden="true" />
          <span className="acg-label">{kind} with {who} in progress</span>
          <button type="button" className="acg-switch" onClick={rejoin}>Switch to call</button>
          <button type="button" className="acg-end" onClick={end} disabled={busy}>{busy ? "Ending…" : "End"}</button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="acg-backdrop" role="dialog" aria-modal="true" aria-labelledby="acg-title">
        <div className="acg-card">
          <h3 id="acg-title" className="acg-title">Call in progress</h3>
          <p className="acg-text">
            {call.status === "active"
              ? "Your consultation is still running on the server and billing continues until it is ended. Rejoin it in a new tab, or end it now."
              : "A call is being set up. Rejoin it in a new tab, or end it now."}
          </p>
          <div className="acg-meta">
            <b>{who}</b>
            {kind}
            {call.startedAt ? ` · started ${new Date(call.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " · connecting"}
          </div>
          <div className="acg-actions">
            <button type="button" className="acg-btn acg-ghost" onClick={end} disabled={busy}>{busy ? "Ending…" : "End call"}</button>
            <button type="button" className="acg-btn acg-primary" onClick={rejoin} disabled={busy}>Rejoin call</button>
          </div>
          {error && <div className="acg-err">{error}</div>}
        </div>
      </div>
    </>
  );
}
