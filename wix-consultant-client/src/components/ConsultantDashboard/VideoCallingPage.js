import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import styles from "./VideoCallingPage.module.css";
import { joinCall, leaveCall, toggleMute, toggleVideo, enableMicrophone, getLocalVideoTrack, getRemoteVideoTrack } from "../Redux/slices/callSlice";
import { clearCallEvent } from "../Redux/slices/sokectSlice";
import { ensureSocketRegistered, SOCKET_ROLE } from "../Sokect-io/SokectConfig";
import { initRingtone, playRingtone, stopRingtone } from "../ringTone/ringingTune";
import { getConsultantId, getCustomerId, isConsultantSession } from "../../utils/wixStorage";
import { useWixUser } from "../../useContext/WixUserContext";
import { formatCurrency } from "../Helper/Helper";

/*
 * In-app call page (/video/calling/page?callId=…). Renders INSIDE the Wix
 * iframe in a bounded shell; nothing here uses vh or window.top.
 *
 * The server owns the lifecycle. This page:
 *   1. loads the session by callId (DB decides the phase)
 *   2. joins Agora once the call is accepted and tells the server (joined)
 *   3. shows "active" only after the server's callConnected (billing start)
 *   4. ends via the idempotent REST endpoint; the socket callEnded settles UI
 */
const BACKEND = process.env.REACT_APP_BACKEND_HOST;
const DEFAULT_AVATAR = "/images/flag/teamdefault.png";
const TERMINAL = ["ended", "rejected", "cancelled", "missed", "failed", "notfound"];

const resolveAvatar = (raw) => (!raw ? DEFAULT_AVATAR : /^https?:\/\//i.test(raw) ? raw.replace(/^http:\/\//i, "https://") : `${BACKEND}/${String(raw).replace(/\\/g, "/")}`);
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const I = {
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>,
  micOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/></svg>,
  cam: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  camOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  end: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
};

function VideoCallingPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const callId = params.get("callId");
  const returnTo = params.get("return");
  const { user } = useWixUser();
  const isConsultant = isConsultantSession();
  const me = isConsultant ? getConsultantId() : user?.wixDbId || getCustomerId();

  const media = useSelector((s) => s.call);
  const { callEvent, callPeer, callEndSummary } = useSelector((s) => s.socket);

  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | ringing | connecting | active | + TERMINAL
  const [note, setNote] = useState(null); // { text, tone }
  const [credits, setCredits] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const joinedRef = useRef(false);
  const terminalRef = useRef(false);

  const isVideo = session?.callType === "video";
  const counterpart = session?.participant || session?.counterpart || null;
  const role = session?.role || (isConsultant ? "consultant" : "user");
  const currency = ""; // amounts come from the server; the store currency symbol is shown by the parent pages

  const instanceQ = (() => { const i = params.get("instance"); return i ? `?instance=${encodeURIComponent(i)}` : ""; })();
  const goBack = useCallback(() => {
    const fallback = isConsultant ? "/consultant-dashboard" : "/consultant/card";
    navigate(`${returnTo && returnTo.startsWith("/") ? returnTo : fallback}${instanceQ}`, { replace: true });
  }, [navigate, returnTo, isConsultant, instanceQ]);

  const finish = useCallback((next, extra = {}) => {
    if (terminalRef.current) return;
    terminalRef.current = true;
    stopRingtone();
    dispatch(leaveCall());
    setPhase(next);
    if (extra.summary) setSummary(extra.summary);
    if (extra.note) setNote(extra.note);
  }, [dispatch]);

  /* ── 1. load session (DB decides) ──────────────────────────── */
  const loadSession = useCallback(async () => {
    if (!me || !callId) return null;
    const { data } = await axios.get(`${BACKEND}/api/call/active-session/${me}`);
    if (!data?.hasActiveCall || String(data.call?.callId) !== String(callId)) return null;
    return data.call;
  }, [me, callId]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureSocketRegistered(me, { role: isConsultant ? SOCKET_ROLE.CONSULTANT : SOCKET_ROLE.CUSTOMER });
        const s = await loadSession();
        if (cancelled) return;
        if (!s) {
          finish("notfound", { note: { text: "This call is no longer active.", tone: "muted" } });
          return;
        }
        setSession(s);
        console.log("[CALL SESSION] page loaded", { callId, status: s.status, role: s.role, channel: s.channelName, callType: s.callType, counterpart: s.participant?.id });
        if (s.status === "ringing") {
          setPhase("ringing");
          if (s.role === "user") { initRingtone(); playRingtone(); }
        } else {
          setPhase(s.status === "active" ? "active" : "connecting");
        }
      } catch (err) {
        if (!cancelled) finish("failed", { note: { text: "Unable to load the call. Please check your connection and try again.", tone: "danger" } });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  /* ── 2. join Agora once accepted (or when resuming) ────────── */
  const fetchToken = useCallback(async () => {
    const { data } = await axios.post(`${BACKEND}/api/call/token/${callId}`, { userId: me });
    if (!data?.success || !data.token) throw new Error(data?.message || "token");
    console.log("[CALL TOKEN] received", { channel: data.channelName, uid: data.uid, expiresAt: new Date(data.expiresAt).toISOString(), tokenLength: String(data.token).length, appId: String(data.appId).slice(0, 6) + "…" });
    return data;
  }, [callId, me]);

  const join = useCallback(async () => {
    if (joinedRef.current || !session) return;
    joinedRef.current = true;
    try {
      const t = await fetchToken();
      const r = await dispatch(joinCall({
        appId: t.appId, channel: t.channelName, token: t.token, uid: t.uid, callType: session.callType,
        renewToken: async () => (await fetchToken()).token,
      }));
      if (joinCall.rejected.match(r)) {
        joinedRef.current = false;
        console.error("[CALL JOIN] failed", r.payload);
        setPhase("failed");
        setNote({ text: r.payload?.message || "Unable to connect the call.", tone: "danger", details: r.payload?.details || r.payload?.code });
        return;
      }
      const joinedRes = await axios.post(`${BACKEND}/api/call/joined/${callId}`, { userId: me });
      console.log("[CALL JOIN] reported to server", { callId, status: joinedRes.data?.session?.status, activated: Boolean(joinedRes.data?.activated) });
    } catch (err) {
      joinedRef.current = false;
      const code = err.response?.data?.code || "";
      if (code.startsWith("call_")) { finish("notfound", { note: { text: "This call is no longer active.", tone: "muted" } }); return; }
      console.error("[CALL JOIN] setup failed", err.response?.data || err.message);
      setPhase("failed");
      setNote({ text: err.response?.data?.message || "Unable to reach the call service. Please check your internet connection and try again.", tone: "danger", details: `${err.response?.status || ""} ${err.response?.data?.code || err.message || ""}`.trim() });
    }
  }, [session, dispatch, fetchToken, callId, me, finish]);

  // Connecting for too long: the server fails the call at CALL_CONNECT_TIMEOUT_MS; tell the user why.
  useEffect(() => {
    if (phase !== "connecting") return;
    const t = setTimeout(() => setNote({ text: "Still connecting… the other participant has not joined yet. The call will be cancelled automatically if it cannot connect.", tone: "warn" }), 20000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if ((phase === "connecting" || phase === "active") && !joinedRef.current) join();
  }, [phase, join]);

  /* ── 3. server lifecycle events ────────────────────────────── */
  useEffect(() => {
    if (!callEvent || String(callEvent.payload?.callId) !== String(callId)) return;
    const { type, payload } = callEvent;
    console.log("[CALL] event", type);
    if (type === "accepted") { stopRingtone(); setSession((s) => ({ ...(s || {}), ...payload, participant: s?.participant || payload.counterpart })); setPhase("connecting"); }
    else if (type === "connected") { setSession((s) => ({ ...(s || {}), ...payload, participant: s?.participant })); setPhase("active"); }
    else if (type === "ended") finish("ended", { summary: payload });
    else if (type === "rejected") finish("rejected", { note: { text: "The consultant declined the call.", tone: "muted" } });
    else if (type === "cancelled") finish("cancelled", { note: { text: role === "user" ? "Call cancelled." : "The client cancelled the call.", tone: "muted" } });
    else if (type === "missed") finish("missed", { note: { text: role === "user" ? "The consultant did not answer." : "Missed call.", tone: "muted" } });
    else if (type === "failed") finish("failed", { note: { text: "The call could not be connected.", tone: "danger" } });
    else if (type === "creditsWarning") setCredits(payload.secondsRemaining);
    else if (type === "creditsExhausted") setCredits(0);
    dispatch(clearCallEvent());
  }, [callEvent, callId, finish, role, dispatch]);

  useEffect(() => {
    if (callEndSummary && String(callEndSummary.callId) === String(callId) && !terminalRef.current) finish("ended", { summary: callEndSummary });
  }, [callEndSummary, callId, finish]);

  /* ── 4. timer from the server's startedAt ──────────────────── */
  useEffect(() => {
    if (phase !== "active" || !session?.startedAt) return;
    const start = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [phase, session?.startedAt]);

  /* ── 5. media rendering ────────────────────────────────────── */
  useEffect(() => {
    if (!media.hasLocalVideo || !media.videoEnabled || !localRef.current) return;
    try { getLocalVideoTrack()?.play(localRef.current, { fit: "cover" }); } catch (e) { /* ignore */ }
  }, [media.hasLocalVideo, media.videoEnabled, media.phase]);

  useEffect(() => {
    if (!media.remoteVideoOn || !remoteRef.current) return;
    try { getRemoteVideoTrack()?.play(remoteRef.current, { fit: "cover" }); } catch (e) { /* ignore */ }
  }, [media.remoteVideoOn]);

  /* ── 6. connection banners ─────────────────────────────────── */
  useEffect(() => {
    if (phase !== "active" && phase !== "connecting") return;
    if (media.agoraState === "RECONNECTING") { setNote({ text: "Reconnecting… trying to restore your connection. The call ends automatically if it cannot be restored.", tone: "warn" }); return; }
    if (callPeer && String(callPeer.callId) === String(callId)) {
      if (callPeer.connected) { setNote({ text: "Connection restored", tone: "ok" }); const t = setTimeout(() => setNote(null), 3000); return () => clearTimeout(t); }
      const total = Math.round((callPeer.graceMs || 20000) / 1000);
      const tick = () => {
        const left = Math.max(0, total - Math.floor((Date.now() - callPeer.since) / 1000));
        setNote({ text: `${role === "user" ? "Consultant" : "Client"} connection lost · waiting to reconnect (${left}s)`, tone: "warn" });
      };
      tick();
      const i = setInterval(tick, 1000);
      return () => clearInterval(i);
    }
    setNote(null);
  }, [media.agoraState, callPeer, callId, phase, role]);

  /* ── 7. actions ────────────────────────────────────────────── */
  const endNow = async () => {
    if (ending) return;
    setEnding(true);
    setConfirmEnd(false);
    try {
      await axios.post(`${BACKEND}/api/call/end-session/${callId}`, { userId: me });
      console.log("[CALL] end requested", callId);
    } catch (err) {
      console.warn("[CALL ERROR] end failed:", err.response?.data?.message || err.message);
      // The session may already be over: settle locally.
      finish("ended");
    }
  };
  const cancelNow = async () => {
    setEnding(true);
    try { await axios.post(`${BACKEND}/api/call/cancel/${callId}`, { userId: me }); } catch (e) { /* settled */ }
    finish("cancelled", { note: { text: "Call cancelled.", tone: "muted" } });
  };
  const retry = () => { setNote(null); setPhase("connecting"); joinedRef.current = false; };
  const embedded = window.self !== window.top;
  const canOpenInTab = Boolean(media.mediaError?.canOpenInTab) && embedded;
  const retryMic = () => { console.log("[CALL DEBUG] retry microphone"); dispatch(enableMicrophone()); };
  const openInTab = () => {
    // Restrictive browsers (e.g. Brave Shields) deny devices to embedded pages;
    // the same page works standalone. Mark it so the storefront gate stays quiet here.
    try { sessionStorage.setItem(`call_in_tab:${callId}`, "1"); } catch (e) { /* ignore */ }
    const url = `${window.location.origin}/video/calling/page?callId=${encodeURIComponent(callId)}${returnTo ? `&return=${encodeURIComponent(returnTo)}` : ""}`;
    const w = window.open(url, "_blank", "noopener");
    if (w) { dispatch(leaveCall()); goBack(); }
    else setNote({ text: "Your browser blocked the new tab. Allow pop-ups for this site and try again.", tone: "danger" });
  };
  const abandon = async () => {
    try { await axios.post(`${BACKEND}/api/call/failed/${callId}`, { userId: me }); } catch (e) { /* ignore */ }
    goBack();
  };

  // Leave media on unmount; never end the session here (refresh → server grace / resume).
  useEffect(() => () => { stopRingtone(); dispatch(leaveCall()); }, [dispatch]);

  /* ── render ────────────────────────────────────────────────── */
  const name = counterpart?.fullname || (role === "user" ? "Consultant" : "Client");
  const avatar = resolveAvatar(counterpart?.profileImage);
  const terminal = TERMINAL.includes(phase);
  const statusText =
    phase === "loading" ? "Loading…" :
    phase === "ringing" ? "Ringing…" :
    phase === "connecting" ? (media.phase === "joined" ? "Waiting for the other participant…" : "Connecting…") :
    phase === "active" ? "Connected" : "";

  return (
    <div className={styles.page}>
      <div className={`${styles.shell} ${isVideo ? styles.shellVideo : ""}`}>
        {/* Header */}
        <div className={styles.head}>
          <div className={styles.headLeft}>
            {terminal && <button type="button" className={styles.iconBtn} onClick={goBack} aria-label="Back">{I.back}</button>}
            <img src={avatar} alt="" className={styles.headAvatar} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
            <div className={styles.headText}>
              <div className={styles.headName}>{name}</div>
              <div className={styles.headSub}>
                {isVideo ? "Video consultation" : "Audio consultation"}
                {!terminal && statusText ? ` · ${statusText}` : ""}
              </div>
            </div>
          </div>
          <div className={styles.headRight}>
            <span className={styles.secure} title="Encrypted media">{I.lock}<span>Secure</span></span>
            {phase === "active" && <span className={styles.timer}>{mmss(elapsed)}</span>}
          </div>
        </div>

        {/* Banners */}
        {note && !terminal && <div className={`${styles.banner} ${styles[`banner_${note.tone}`] || ""}`} role="status">{note.text}</div>}
        {media.mediaWarning && (phase === "active" || phase === "connecting") && (
          <div className={`${styles.banner} ${styles.banner_warn}`}>
            <span>{media.mediaWarning.message}</span>
            {!media.hasLocalAudio && (
              <span className={styles.bannerActions}>
                <button type="button" className={styles.bannerBtn} onClick={retryMic} disabled={media.micRetrying}>{media.micRetrying ? "Checking…" : "Retry microphone"}</button>
                {embedded && <button type="button" className={styles.bannerBtn} onClick={openInTab}>Open in a new tab</button>}
              </span>
            )}
          </div>
        )}
        {credits != null && phase === "active" && (
          <div className={`${styles.banner} ${credits <= 10 ? styles.banner_danger : styles.banner_warn}`} role="alert">
            {credits > 0 ? `${credits} seconds of credits remaining` : "Credits exhausted — ending call"}
          </div>
        )}

        {/* Stage */}
        <div className={styles.stage}>
          {isVideo && !terminal ? (
            <>
              <div className={styles.remote}>
                <div ref={remoteRef} className={styles.video} style={{ display: media.remoteVideoOn ? "block" : "none" }} />
                {!media.remoteVideoOn && (
                  <div className={styles.placeholder}>
                    <img src={avatar} alt="" className={styles.bigAvatar} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                    <div className={styles.phName}>{name}</div>
                    <div className={styles.phSub}>{phase === "active" ? (media.remoteJoined ? "Camera is turned off" : "Reconnecting…") : statusText}</div>
                  </div>
                )}
                {phase === "active" && media.remoteJoined && !media.remoteAudioOn && <span className={styles.remoteMuted}>{I.micOff} Muted</span>}
              </div>
              <div className={styles.local}>
                <div ref={localRef} className={styles.video} style={{ display: media.hasLocalVideo && media.videoEnabled ? "block" : "none" }} />
                {!(media.hasLocalVideo && media.videoEnabled) && <div className={styles.localOff}><span>You</span><small>Camera off</small></div>}
              </div>
            </>
          ) : (
            <div className={styles.audioStage}>
              <div className={`${styles.ring} ${phase === "ringing" || phase === "connecting" ? styles.ringPulse : ""}`}>
                <img src={avatar} alt="" className={styles.bigAvatar} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
              </div>
              <div className={styles.phName}>{name}</div>
              {!terminal && (
                <div className={`${styles.status} ${phase === "active" ? styles.statusOk : ""}`}>
                  {phase === "active" && <span className={styles.dot} />}
                  {statusText}
                </div>
              )}
              {phase === "active" && <div className={styles.bigTimer}>{mmss(elapsed)}</div>}
              {phase === "active" && media.remoteJoined && !media.remoteAudioOn && <div className={styles.phSub}>{name} is muted</div>}

              {terminal && (
                <div className={styles.summary}>
                  <div className={styles.summaryTitle}>
                    {phase === "ended" ? "Call ended" : phase === "rejected" ? "Call declined" : phase === "cancelled" ? "Call cancelled" : phase === "missed" ? "No answer" : phase === "failed" ? "Call failed" : "Call unavailable"}
                  </div>
                  {note?.text && phase !== "ended" && <div className={styles.summaryText}>{note.text}</div>}
                  {note?.details && phase === "failed" && <div className={styles.summaryText} style={{ marginTop: 6, fontSize: 11.5, fontFamily: "monospace", opacity: 0.8 }}>Technical details: {note.details}</div>}
                  {phase === "ended" && summary && (
                    <dl className={styles.summaryGrid}>
                      <div><dt>Type</dt><dd>{isVideo ? "Video consultation" : "Audio consultation"}</dd></div>
                      <div><dt>Duration</dt><dd>{mmss(summary.durationSeconds || 0)}</dd></div>
                      {role === "user" && <div><dt>Amount charged</dt><dd>{formatCurrency(currency, summary.finalAmount)}</dd></div>}
                      {role === "user" && summary.remainingBalance != null && <div><dt>Remaining balance</dt><dd>{formatCurrency(currency, summary.remainingBalance)}</dd></div>}
                      {role === "consultant" && <div><dt>Your earnings</dt><dd>{formatCurrency(currency, summary.consultantShare)}</dd></div>}
                      {summary.endReason && summary.endReason !== "ended" && <div><dt>Reason</dt><dd>{String(summary.endReason).replace(/_/g, " ")}</dd></div>}
                    </dl>
                  )}
                  {phase === "ended" && !summary && <div className={styles.summaryText}>The session has been closed.</div>}
                  <div className={styles.summaryActions}>
                    {phase === "failed" && !terminalRef.current && canOpenInTab && <button type="button" className={styles.btn} onClick={openInTab}>Open in a new tab</button>}
                    {phase === "failed" && !terminalRef.current && <button type="button" className={canOpenInTab ? styles.btnGhost : styles.btn} onClick={retry}>Try again</button>}
                    {phase === "failed" && <button type="button" className={styles.btnGhost} onClick={abandon}>Close</button>}
                    {phase !== "failed" && <button type="button" className={styles.btn} onClick={goBack}>{isConsultant ? "Back to dashboard" : "Back"}</button>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        {!terminal && (
          <div className={styles.controls}>
            {phase === "ringing" ? (
              <button type="button" className={styles.endBtn} onClick={cancelNow} disabled={ending}>{I.end}<span>{ending ? "Cancelling…" : "Cancel"}</span></button>
            ) : (
              <>
                <button type="button" className={`${styles.ctl} ${media.muted ? styles.ctlOff : ""}`} onClick={() => dispatch(toggleMute())} disabled={media.phase !== "joined" || !media.hasLocalAudio} aria-pressed={media.muted} title={media.muted ? "Unmute" : "Mute"}>
                  {media.muted ? I.micOff : I.mic}<span>{media.muted ? "Unmute" : "Mute"}</span>
                </button>
                {isVideo && (
                  <button type="button" className={`${styles.ctl} ${!media.videoEnabled ? styles.ctlOff : ""}`} onClick={() => dispatch(toggleVideo())} disabled={!media.hasLocalVideo} aria-pressed={!media.videoEnabled} title={media.videoEnabled ? "Turn camera off" : "Turn camera on"}>
                    {media.videoEnabled ? I.cam : I.camOff}<span>{media.videoEnabled ? "Camera" : "Camera off"}</span>
                  </button>
                )}
                <button type="button" className={styles.endBtn} onClick={() => setConfirmEnd(true)} disabled={ending}>{I.end}<span>{ending ? "Ending…" : "End call"}</span></button>
              </>
            )}
          </div>
        )}

        {/* End confirmation */}
        {confirmEnd && (
          <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="end-title">
            <div className={styles.modal}>
              <h3 id="end-title" className={styles.modalTitle}>End call?</h3>
              <p className={styles.modalText}>{role === "user" ? "Your final charges will be calculated from the connected time." : "This will end the consultation and finalize billing."}</p>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnGhost} onClick={() => setConfirmEnd(false)}>Cancel</button>
                <button type="button" className={styles.btnDanger} onClick={endNow}>End call</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoCallingPage;
