import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setIncomingCall } from "../Redux/slices/sokectSlice";
import { ensureSocketRegistered, SOCKET_ROLE } from "../Sokect-io/SokectConfig";
import { bindSocketListeners } from "../Sokect-io/socketEventBridge";
import TestRingtone from "../../pages/TestRingtone";
import { getConsultantId } from "../../utils/wixStorage";
import { callPagePath } from "../middle-ware/OpenCallingPage";

const BACKEND = process.env.REACT_APP_BACKEND_HOST;
const DEFAULT_AVATAR = "/images/flag/teamdefault.png";

const css = `
.ic-card{position:fixed;top:16px;right:16px;z-index:100000;width:340px;max-width:calc(100vw - 32px);padding:16px;background:#fff;border:1px solid #e6e8ec;border-radius:14px;box-shadow:0 16px 40px -8px rgba(16,24,40,.25);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111318;animation:icIn .25s ease}
@keyframes icIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.ic-kicker{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#666b78;margin-bottom:10px}
.ic-dot{width:8px;height:8px;border-radius:50%;background:#067647;animation:icPulse 1.2s infinite}
@keyframes icPulse{0%,100%{box-shadow:0 0 0 0 rgba(6,118,71,.35)}50%{box-shadow:0 0 0 6px rgba(6,118,71,0)}}
.ic-who{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.ic-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;background:#eeeff2;border:1px solid #e6e8ec;flex-shrink:0}
.ic-name{font-size:15px;font-weight:650;line-height:1.2}
.ic-sub{font-size:12.5px;color:#666b78;margin-top:2px}
.ic-actions{display:flex;gap:8px}
.ic-btn{flex:1;padding:10px 12px;border-radius:9px;border:0;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.ic-decline{background:#fef3f2;color:#b42318;border:1px solid #f4b4ae}
.ic-decline:hover{background:#fde4e1}
.ic-accept{background:#067647;color:#fff}
.ic-accept:hover{background:#05633b}
.ic-btn:disabled{opacity:.6;cursor:not-allowed}
.ic-bar{height:3px;border-radius:999px;background:#eeeff2;overflow:hidden;margin-top:12px}
.ic-bar > span{display:block;height:100%;background:#067647;transition:width 1s linear}
.ic-err{margin-top:8px;font-size:12.5px;color:#b42318}
`;

export default function IncomingCallAlert() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const consultantId = getConsultantId();
  const { incomingCall, callEvent } = useSelector((state) => state.socket);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(null);

  useEffect(() => {
    if (!consultantId) return;
    ensureSocketRegistered(consultantId, { role: SOCKET_ROLE.CONSULTANT }).then((ok) => ok && bindSocketListeners());
  }, [consultantId]);

  // The server settles the ring: cancelled by caller, missed (timeout), or ended.
  useEffect(() => {
    if (!incomingCall || !callEvent) return;
    const same = String(callEvent.payload?.callId) === String(incomingCall.callId);
    if (same && ["cancelled", "missed", "ended", "failed"].includes(callEvent.type)) {
      dispatch(setIncomingCall(null));
    }
  }, [callEvent, incomingCall, dispatch]);

  // Ring countdown (display only; the server owns the timeout)
  useEffect(() => {
    if (!incomingCall) { setLeft(null); setError(""); return; }
    const total = Math.round((incomingCall.ringTimeoutMs || 30000) / 1000);
    const startedAt = Date.now();
    const tick = () => setLeft(Math.max(0, total - Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [incomingCall]);

  if (!incomingCall || !consultantId) return null;

  const { callId, callType, callerName, callerAvatar } = incomingCall;
  const isVideo = callType === "video";
  const total = Math.round((incomingCall.ringTimeoutMs || 30000) / 1000);

  const accept = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await ensureSocketRegistered(consultantId, { role: SOCKET_ROLE.CONSULTANT });
      const { data } = await axios.post(`${BACKEND}/api/call/accept/${callId}`, { userId: consultantId });
      if (!data?.success) throw new Error(data?.message || "Could not accept");
      console.log("[CALL] accepted", callId);
      dispatch(setIncomingCall(null));
      navigate(callPagePath(callId, "/consultant-dashboard"));
    } catch (err) {
      const code = err.response?.data?.code || "";
      setError(code ? "This call is no longer available." : err.message);
      setTimeout(() => dispatch(setIncomingCall(null)), 1500);
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await axios.post(`${BACKEND}/api/call/reject/${callId}`, { userId: consultantId });
    } catch (err) {
      /* already settled server-side */
    } finally {
      dispatch(setIncomingCall(null));
      setBusy(false);
    }
  };

  return (
    <>
      <style>{css}</style>
      <TestRingtone incomingCall={incomingCall} />
      <div className="ic-card" role="dialog" aria-modal="false" aria-label={`Incoming ${isVideo ? "video" : "audio"} call`}>
        <div className="ic-kicker">
          <span className="ic-dot" aria-hidden="true" />
          Incoming {isVideo ? "video" : "audio"} call
        </div>
        <div className="ic-who">
          <img
            className="ic-avatar"
            src={callerAvatar ? (/^https?:/i.test(callerAvatar) ? callerAvatar : `${BACKEND}/${String(callerAvatar).replace(/\\/g, "/")}`) : DEFAULT_AVATAR}
            alt=""
            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
          />
          <div>
            <div className="ic-name">{callerName || "Client"}</div>
            <div className="ic-sub">{isVideo ? "Video consultation" : "Audio consultation"}{left != null ? ` · ${left}s` : ""}</div>
          </div>
        </div>
        <div className="ic-actions">
          <button type="button" className="ic-btn ic-decline" onClick={decline} disabled={busy}>Decline</button>
          <button type="button" className="ic-btn ic-accept" onClick={accept} disabled={busy}>{busy ? "Connecting…" : "Accept"}</button>
        </div>
        {error && <div className="ic-err">{error}</div>}
        {left != null && <div className="ic-bar" aria-hidden="true"><span style={{ width: `${(left / total) * 100}%` }} /></div>}
      </div>
    </>
  );
}
