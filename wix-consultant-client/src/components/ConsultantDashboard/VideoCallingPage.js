import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import styles from "./VideoCallingPage.module.css";
import {
  joinCall, leaveCall, toggleMute, toggleVideo, enableMicrophone, setMicrophoneDevice, setSpeakerDevice,
  getLocalVideoTrack, getRemoteVideoTrack,
} from "../Redux/slices/callSlice";
import { clearCallEvent } from "../Redux/slices/sokectSlice";
import { ensureSocketRegistered, getSocketInstance, SOCKET_ROLE } from "../Sokect-io/SokectConfig";
import { initRingtone, playRingtone, stopRingtone } from "../ringTone/ringingTune";
import { getConsultantId, getCustomerId, isConsultantSession } from "../../utils/wixStorage";
import { announceCall } from "../../utils/callTab";
import { formatCurrency } from "../Helper/Helper";

/*
 * Standalone call page — /video/calling/page?callId=…&as=user|consultant
 *
 * ALWAYS opened as a top-level tab (utils/callTab.js); never rendered inside
 * the Wix section. Because it is top-level it may fill the viewport.
 *
 * The server owns the lifecycle. This page:
 *   1. loads the session by callId (DB decides the phase)
 *   2. registers its socket and ATTACHES it to the call (call-attach) so the
 *      server treats this tab — not the Wix page — as the participant's presence
 *   3. joins Agora once the call is accepted and reports joined
 *   4. shows "active" only after the server's callConnected (billing start)
 *   5. ends via the idempotent REST endpoint; the socket callEnded settles UI
 *   6. on any terminal state, closes itself (it was opened by script) after a
 *      short summary, and tells the original page over BroadcastChannel
 */
const BACKEND = process.env.REACT_APP_BACKEND_HOST;
const DEFAULT_AVATAR = "/images/flag/teamdefault.png";
const TERMINAL = ["ended", "rejected", "cancelled", "missed", "failed", "notfound"];
const AUTO_CLOSE_SEC = 6;
const HEARTBEAT_MS = 2000;

const resolveAvatar = (raw) => (!raw ? DEFAULT_AVATAR : /^https?:\/\//i.test(raw) ? raw.replace(/^http:\/\//i, "https://") : `${BACKEND}/${String(raw).replace(/\\/g, "/")}`);
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const I = {
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>,
  micOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/></svg>,
  cam: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  camOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  end: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

/**
 * Who am I in this tab? The URL carries role + id (the opener put them there),
 * because localStorage written inside the Wix iframe is partitioned by the
 * browser and invisible to this top-level tab. Storage is only a fallback.
 */
function resolveIdentity(as, uid) {
  if (uid && (as === "consultant" || as === "user")) return { me: uid, isConsultant: as === "consultant" };
  if (as === "consultant") return { me: getConsultantId(), isConsultant: true };
  if (as === "user") return { me: getCustomerId(), isConsultant: false };
  const isC = isConsultantSession();
  return { me: isC ? getConsultantId() : getCustomerId(), isConsultant: isC };
}

function VideoCallingPage() {
  const dispatch = useDispatch();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const callId = params.get("callId");
  const preparing = params.get("preparing") === "1" && !callId;
  const { me, isConsultant } = useMemo(() => resolveIdentity(params.get("as"), params.get("uid")), [params]);

  const media = useSelector((s) => s.call);
  const { callEvent, callPeer, callEndSummary } = useSelector((s) => s.socket);

  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | ringing | connecting | active | + TERMINAL
  const [note, setNote] = useState(null); // { text, tone, details }
  const [credits, setCredits] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState(null);
  const [closeIn, setCloseIn] = useState(null);
  const [closeBlocked, setCloseBlocked] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [devices, setDevices] = useState({ mics: [], speakers: [] });
  const [prepTimedOut, setPrepTimedOut] = useState(false);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const joinedRef = useRef(false);
  const terminalRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const isVideo = session?.callType === "video";
  const counterpart = session?.participant || session?.counterpart || null;
  const role = session?.role || (isConsultant ? "consultant" : "user");
  const currency = "";

  /* ── tab close ─────────────────────────────────────────────── */
  const tryClose = useCallback(() => {
    console.log("[CALL TAB] closing");
    try { window.close(); } catch (e) { /* ignore */ }
    setTimeout(() => setCloseBlocked(true), 500); // still here → browser refused
  }, []);

  const finish = useCallback((next, extra = {}) => {
    if (terminalRef.current) return;
    terminalRef.current = true;
    stopRingtone();
    dispatch(leaveCall());
    setPhase(next);
    if (extra.summary) setSummary(extra.summary);
    if (extra.note) setNote(extra.note);
    if (callId) announceCall({ type: "ended", callId, phase: next });
    console.log("[CALL END] page settled", { callId, phase: next });
  }, [dispatch, callId]);

  // Terminal → countdown → close (opened by script, so window.close() is allowed).
  useEffect(() => {
    if (!TERMINAL.includes(phase) || phase === "failed") return;
    setCloseIn(AUTO_CLOSE_SEC);
    const i = setInterval(() => setCloseIn((n) => (n == null ? n : n - 1)), 1000);
    const t = setTimeout(tryClose, AUTO_CLOSE_SEC * 1000);
    return () => { clearInterval(i); clearTimeout(t); };
  }, [phase, tryClose]);

  /* ── preparing (reserved tab, waiting for the opener to navigate) ── */
  useEffect(() => {
    if (!preparing) return;
    const t = setTimeout(() => setPrepTimedOut(true), 20000);
    return () => clearTimeout(t);
  }, [preparing]);

  /* ── 1. load session (DB decides) ──────────────────────────── */
  const loadSession = useCallback(async () => {
    if (!me || !callId) return null;
    const { data } = await axios.get(`${BACKEND}/api/call/active-session/${me}`);
    if (!data?.hasActiveCall || String(data.call?.callId) !== String(callId)) return null;
    return data.call;
  }, [me, callId]);

  const attach = useCallback(() => {
    const s = getSocketInstance();
    if (!s || !callId) return;
    s.emit("call-attach", { callId });
    console.log("[CALL SESSION] socket attached to call", callId);
  }, [callId]);

  useEffect(() => {
    if (preparing || !callId) return;
    if (!me) { finish("notfound", { note: { text: "We could not identify you. Please open the call again from the site.", tone: "danger" } }); return; }
    let cancelled = false;
    (async () => {
      try {
        await ensureSocketRegistered(me, { role: isConsultant ? SOCKET_ROLE.CONSULTANT : SOCKET_ROLE.CUSTOMER });
        attach();
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
  }, [me, callId, preparing]);

  // Socket dropped and came back (network blip): re-register + re-attach so the
  // server ends the grace period for this participant.
  useEffect(() => {
    if (preparing || !me || !callId) return;
    const s = getSocketInstance();
    if (!s) return;
    const onConnect = () => {
      console.log("[CALL DISCONNECT] socket reconnected → re-register + attach");
      ensureSocketRegistered(me, { role: isConsultant ? SOCKET_ROLE.CONSULTANT : SOCKET_ROLE.CUSTOMER, force: true }).then((ok) => ok && attach());
    };
    s.on("connect", onConnect);
    return () => s.off("connect", onConnect);
  }, [me, callId, isConsultant, preparing, attach]);

  /* ── heartbeat to the original page ────────────────────────── */
  useEffect(() => {
    if (!callId || preparing) return;
    const beat = () => { if (!terminalRef.current) announceCall({ type: "alive", callId, status: phaseRef.current, callType: session?.callType, who: counterpart?.fullname }); };
    beat();
    const i = setInterval(beat, HEARTBEAT_MS);
    const onHide = () => { if (!terminalRef.current) announceCall({ type: "gone", callId }); };
    window.addEventListener("pagehide", onHide);
    return () => { clearInterval(i); window.removeEventListener("pagehide", onHide); };
  }, [callId, preparing, session?.callType, counterpart?.fullname]);

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
      console.log("[CALL JOIN] reported to server", { callId, status: joinedRes.data?.session?.status });
    } catch (err) {
      joinedRef.current = false;
      const code = err.response?.data?.code || "";
      if (code.startsWith("call_")) { finish("notfound", { note: { text: "This call is no longer active.", tone: "muted" } }); return; }
      console.error("[CALL JOIN] setup failed", err.response?.data || err.message);
      setPhase("failed");
      setNote({ text: err.response?.data?.message || "Unable to reach the call service. Please check your internet connection and try again.", tone: "danger", details: `${err.response?.status || ""} ${err.response?.data?.code || err.message || ""}`.trim() });
    }
  }, [session, dispatch, fetchToken, callId, me, finish]);

  useEffect(() => {
    if (phase !== "connecting") return;
    const t = setTimeout(() => setNote({ text: "Still connecting… the other participant has not joined yet. The call is cancelled automatically if it cannot connect.", tone: "warn" }), 20000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if ((phase === "connecting" || phase === "active") && !joinedRef.current) join();
  }, [phase, join]);

  /* ── 3. server lifecycle events ────────────────────────────── */
  useEffect(() => {
    if (!callEvent || String(callEvent.payload?.callId) !== String(callId)) return;
    const { type, payload } = callEvent;
    console.log("[CALL SESSION] event", type);
    if (type === "accepted") { stopRingtone(); setSession((s) => ({ ...(s || {}), ...payload, participant: s?.participant || payload.counterpart })); setPhase("connecting"); }
    else if (type === "connected") { setSession((s) => ({ ...(s || {}), ...payload, participant: s?.participant })); setPhase("active"); announceCall({ type: "connected", callId, status: "active" }); }
    else if (type === "ended") finish("ended", { summary: payload });
    else if (type === "rejected") finish("rejected", { note: { text: "The consultant declined the call.", tone: "muted" } });
    else if (type === "cancelled") finish("cancelled", { note: { text: role === "user" ? "Call cancelled." : "The client cancelled the call.", tone: "muted" } });
    else if (type === "missed") finish("missed", { note: { text: role === "user" ? "The consultant did not answer." : "Missed call.", tone: "muted" } });
    else if (type === "failed") finish("failed", { note: { text: payload?.reason === "connect_timeout" ? "The call could not be connected in time." : "The call could not be connected.", tone: "danger" } });
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

  /* ── 7. devices ────────────────────────────────────────────── */
  const openDevices = async () => {
    setDevicesOpen((o) => !o);
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        mics: list.filter((d) => d.kind === "audioinput" && d.deviceId),
        speakers: list.filter((d) => d.kind === "audiooutput" && d.deviceId),
      });
    } catch (e) { setDevices({ mics: [], speakers: [] }); }
  };

  /* ── 8. actions ────────────────────────────────────────────── */
  const endNow = async () => {
    if (ending) return;
    setEnding(true);
    setConfirmEnd(false);
    try {
      await axios.post(`${BACKEND}/api/call/end-session/${callId}`, { userId: me });
      console.log("[CALL END] requested", callId);
    } catch (err) {
      console.warn("[CALL ERROR] end failed:", err.response?.data?.message || err.message);
      finish("ended");
    }
  };
  const cancelNow = async () => {
    setEnding(true);
    try { await axios.post(`${BACKEND}/api/call/cancel/${callId}`, { userId: me }); } catch (e) { /* settled */ }
    finish("cancelled", { note: { text: "Call cancelled.", tone: "muted" } });
  };
  const retry = () => { setNote(null); setCloseBlocked(false); setPhase("connecting"); joinedRef.current = false; };
  const retryMic = () => { console.log("[CALL DEBUG] retry microphone"); dispatch(enableMicrophone()); };
  const abandon = async () => {
    try { await axios.post(`${BACKEND}/api/call/failed/${callId}`, { userId: me }); } catch (e) { /* ignore */ }
    finish("failed", { note: note || { text: "The call could not be connected.", tone: "danger" } });
    tryClose();
  };

  // Leave media on unmount; never end the session here (refresh → server grace / resume).
  useEffect(() => () => { stopRingtone(); dispatch(leaveCall()); }, [dispatch]);

  /* ── render: preparing ─────────────────────────────────────── */
  if (preparing || !callId) {
    return (
      <div className={styles.page}>
        <div className={styles.prep}>
          {!prepTimedOut && callId == null && preparing ? (
            <>
              <div className={styles.spinner} aria-hidden="true" />
              <div className={styles.prepTitle}>Preparing your call…</div>
              <div className={styles.prepText}>This tab will connect automatically.</div>
            </>
          ) : (
            <>
              <div className={styles.prepTitle}>{preparing ? "The call could not be started" : "No call selected"}</div>
              <div className={styles.prepText}>Return to the site and try again. You can close this tab.</div>
              <button type="button" className={styles.btn} onClick={tryClose}>Close tab</button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── render: call ──────────────────────────────────────────── */
  const name = counterpart?.fullname || (role === "user" ? "Consultant" : "Client");
  const avatar = resolveAvatar(counterpart?.profileImage);
  const terminal = TERMINAL.includes(phase);
  const statusText =
    phase === "loading" ? "Loading…" :
    phase === "ringing" ? "Ringing…" :
    phase === "connecting" ? (media.phase === "joined" ? "Waiting for the other participant…" : "Connecting…") :
    phase === "active" ? "Connected" : "";
  const title =
    phase === "ended" ? "Call ended" : phase === "rejected" ? "Call declined" : phase === "cancelled" ? "Call cancelled" :
    phase === "missed" ? "No answer" : phase === "failed" ? "Call failed" : "Call unavailable";

  return (
    <div className={styles.page}>
      <div className={`${styles.shell} ${isVideo && !terminal ? styles.shellVideo : ""}`}>
        {/* Header */}
        <div className={styles.head}>
          <div className={styles.headLeft}>
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
            {!terminal && <span className={`${styles.conn} ${media.agoraState === "CONNECTED" ? styles.connOk : media.agoraState === "RECONNECTING" ? styles.connWarn : ""}`}>
              <span className={styles.connDot} />{media.agoraState === "CONNECTED" ? "Stable" : media.agoraState === "RECONNECTING" ? "Reconnecting" : "Not connected"}
            </span>}
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
                {!(media.hasLocalVideo && media.videoEnabled) && <div className={styles.localOff}><span>You</span><small>{media.hasLocalVideo ? "Camera off" : "No camera"}</small></div>}
              </div>
            </>
          ) : (
            <div className={styles.audioStage}>
              {!terminal && (
                <>
                  <div className={`${styles.ring} ${phase === "ringing" || phase === "connecting" ? styles.ringPulse : ""}`}>
                    <img src={avatar} alt="" className={styles.bigAvatar} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                  </div>
                  <div className={styles.phName}>{name}</div>
                  <div className={`${styles.status} ${phase === "active" ? styles.statusOk : ""}`}>
                    {phase === "active" && <span className={styles.dot} />}
                    {statusText}
                  </div>
                  {phase === "active" && <div className={styles.bigTimer}>{mmss(elapsed)}</div>}
                  {phase === "active" && media.remoteJoined && !media.remoteAudioOn && <div className={styles.phSub}>{name} is muted</div>}
                </>
              )}

              {terminal && (
                <div className={styles.summary}>
                  <div className={styles.summaryTitle}>{title}</div>
                  {note?.text && phase !== "ended" && <div className={styles.summaryText}>{note.text}</div>}
                  {note?.details && phase === "failed" && <div className={styles.summaryDetails}>Technical details: {note.details}</div>}
                  {phase === "ended" && summary && (
                    <dl className={styles.summaryGrid}>
                      <div><dt>With</dt><dd>{name}</dd></div>
                      <div><dt>Type</dt><dd>{isVideo ? "Video consultation" : "Audio consultation"}</dd></div>
                      <div><dt>Duration</dt><dd>{mmss(summary.durationSeconds || 0)}</dd></div>
                      {role === "user" && <div><dt>Amount charged</dt><dd>{formatCurrency(currency, summary.finalAmount)}</dd></div>}
                      {role === "user" && summary.remainingBalance != null && <div><dt>Remaining balance</dt><dd>{formatCurrency(currency, summary.remainingBalance)}</dd></div>}
                      {role === "consultant" && <div><dt>Your earnings</dt><dd>{formatCurrency(currency, summary.consultantShare)}</dd></div>}
                      {summary.endReason && summary.endReason !== "ended" && <div><dt>Reason</dt><dd>{String(summary.endReason).replace(/_/g, " ")}</dd></div>}
                    </dl>
                  )}
                  {phase === "ended" && !summary && <div className={styles.summaryText}>The session has been closed.</div>}
                  <div className={styles.closeNote}>
                    {closeBlocked
                      ? `You can close this tab now${isConsultant ? " and continue in your dashboard" : ""}.`
                      : closeIn != null
                        ? `This tab closes in ${Math.max(0, closeIn)}s. Your ${isConsultant ? "dashboard" : "page"} is still open in the other tab.`
                        : ""}
                  </div>
                  <div className={styles.summaryActions}>
                    {phase === "failed" && !terminalRef.current && <button type="button" className={styles.btn} onClick={retry}>Try again</button>}
                    {phase === "failed" && !terminalRef.current && <button type="button" className={styles.btnGhost} onClick={abandon}>Close</button>}
                    {(phase !== "failed" || terminalRef.current) && <button type="button" className={styles.btn} onClick={tryClose}>Close tab</button>}
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
                <span className={styles.devWrap}>
                  <button type="button" className={styles.ctl} onClick={openDevices} disabled={media.phase !== "joined"} aria-expanded={devicesOpen} title="Devices">{I.gear}<span>Devices</span></button>
                  {devicesOpen && (
                    <div className={styles.devMenu}>
                      <label className={styles.devLabel}>Microphone
                        <select className={styles.devSelect} value={media.micId || ""} disabled={!media.hasLocalAudio || !devices.mics.length} onChange={(e) => dispatch(setMicrophoneDevice(e.target.value))}>
                          {!devices.mics.length && <option value="">{media.hasLocalAudio ? "Default" : "No microphone"}</option>}
                          {devices.mics.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
                        </select>
                      </label>
                      <label className={styles.devLabel}>Speaker
                        <select className={styles.devSelect} value={media.speakerId || ""} disabled={!devices.speakers.length} onChange={(e) => dispatch(setSpeakerDevice(e.target.value))}>
                          {!devices.speakers.length && <option value="">System default</option>}
                          {devices.speakers.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${i + 1}`}</option>)}
                        </select>
                      </label>
                      <div className={styles.devHint}>{media.hasLocalAudio ? "Microphone on" : "No microphone — receive only"}{isVideo ? media.hasLocalVideo ? " · Camera on" : " · No camera" : ""}</div>
                    </div>
                  )}
                </span>
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
