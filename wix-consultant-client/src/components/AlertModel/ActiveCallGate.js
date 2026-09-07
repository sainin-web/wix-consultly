import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useWixUser } from "../../useContext/WixUserContext";
import { getCustomerId } from "../../utils/wixStorage";
import { callPagePath } from "../middle-ware/OpenCallingPage";

const BACKEND = process.env.REACT_APP_BACKEND_HOST;

const css = `
.acg-backdrop{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(17,24,39,.45)}
.acg-card{width:100%;max-width:420px;padding:20px;background:#fff;border-radius:12px;box-shadow:0 16px 40px -8px rgba(16,24,40,.25);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111318}
.acg-title{margin:0 0 6px;font-size:17px;font-weight:650}
.acg-text{margin:0 0 6px;font-size:13.5px;line-height:1.55;color:#666b78}
.acg-meta{margin:10px 0 16px;padding:10px 12px;border-radius:9px;background:#f8f9fb;font-size:13px}
.acg-meta b{display:block;font-size:14px;color:#111318}
.acg-actions{display:flex;justify-content:flex-end;gap:8px}
.acg-btn{padding:9px 14px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}
.acg-ghost{border:1px solid #d1d5db;background:#fff;color:#111318}
.acg-primary{border:0;background:#ff6b35;color:#fff}
.acg-btn:disabled{opacity:.55;cursor:not-allowed}
`;

/**
 * Storefront: after a refresh, if the server says this customer has a live call,
 * offer Resume (rejoin the same session — no new billing) or End (idempotent).
 * The DB decides; nothing is read from localStorage.
 */
export default function ActiveCallGate() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useWixUser();
  const userId = user?.wixDbId || getCustomerId();
  const [call, setCall] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || pathname.startsWith("/video/calling")) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${BACKEND}/api/call/active-session/${userId}`);
        let inOtherTab = false;
        try { inOtherTab = Boolean(data?.call?.callId && sessionStorage.getItem(`call_in_tab:${data.call.callId}`)); } catch (e) { /* ignore */ }
        if (!cancelled && !inOtherTab && data?.hasActiveCall && ["accepted", "connecting", "active"].includes(data.call?.status)) {
          console.log("[CALL] active call found after load", data.call.callId);
          setCall(data.call);
        }
      } catch (err) {
        /* no gate on failure */
      }
    })();
    return () => { cancelled = true; };
  }, [userId, pathname]);

  if (!call) return null;

  const resume = () => {
    setCall(null);
    navigate(callPagePath(call.callId, pathname));
  };
  const end = async () => {
    setBusy(true);
    try {
      await axios.post(`${BACKEND}/api/call/end-session/${call.callId}`, { userId });
    } catch (err) {
      /* idempotent; ignore */
    } finally {
      setBusy(false);
      setCall(null);
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="acg-backdrop" role="dialog" aria-modal="true" aria-labelledby="acg-title">
        <div className="acg-card">
          <h3 id="acg-title" className="acg-title">Active call</h3>
          <p className="acg-text">You have an active consultation in progress. Billing continues until the call is ended.</p>
          <div className="acg-meta">
            <b>{call.participant?.fullname || "Consultant"}</b>
            {call.callType === "video" ? "Video call" : "Audio call"}
            {call.startedAt ? ` · started ${new Date(call.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " · connecting"}
          </div>
          <div className="acg-actions">
            <button type="button" className="acg-btn acg-ghost" onClick={end} disabled={busy}>{busy ? "Ending…" : "End call"}</button>
            <button type="button" className="acg-btn acg-primary" onClick={resume} disabled={busy}>Resume call</button>
          </div>
        </div>
      </div>
    </>
  );
}
