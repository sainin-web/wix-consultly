import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AgoraRTC from "agora-rtc-sdk-ng";

/**
 * Agora media manager (agora-rtc-sdk-ng 4.x).
 *
 * This slice owns ONLY media: join/leave, local tracks, remote tracks and the
 * SDK connection state. Call lifecycle and billing are decided by the server
 * (services/callSession.js) and arrive through socketEventBridge.
 *
 * Listeners are attached once per client instance and the client is reused.
 */
AgoraRTC.setLogLevel(2);
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

let localAudioTrack = null;
let localVideoTrack = null;
let remoteAudioTrack = null;
let remoteVideoTrack = null;
let dispatchRef = null;
let renewTokenFn = null;
let listenersBound = false;

export const getLocalVideoTrack = () => localVideoTrack;
export const getRemoteVideoTrack = () => remoteVideoTrack;
export const getRemoteAudioTrack = () => remoteAudioTrack;
let speakerId = null; // chosen output device, re-applied to every new remote audio track
export const getAgoraClient = () => client;

/** Map SDK errors to something a human can act on. */
export function describeMediaError(err, callType) {
  const code = String(err?.code || err?.name || "");
  const msg = String(err?.message || "");
  if (code.includes("PERMISSION_DENIED") || /permission/i.test(msg)) {
    return {
      code: "permission_denied",
      message:
        callType === "video"
          ? "Camera and microphone access are required for a video consultation. Please allow access in your browser settings and try again."
          : "Microphone access is required to start an audio consultation. Please allow access in your browser settings and try again.",
    };
  }
  if (code.includes("NOT_FOUND") || /device not found/i.test(msg)) {
    return { code: "device_not_found", message: callType === "video" ? "No camera or microphone was found on this device." : "No microphone was found on this device." };
  }
  if (code.includes("NOT_READABLE") || /in use|could not start/i.test(msg)) {
    return { code: "device_busy", message: "Your camera or microphone is already in use by another application." };
  }
  if (code.includes("NOT_SUPPORTED") || /not support/i.test(msg)) {
    return { code: "not_supported", message: "Your browser does not support calling. Please use a recent version of Chrome, Edge, Safari or Firefox." };
  }
  if (code.includes("CAN_NOT_GET_GATEWAY_SERVER") || /vendor key|appid|app id/i.test(msg)) {
    return { code: "agora_rejected", message: "The call service rejected this session (App ID / token mismatch). Please try again; if it persists, contact support." };
  }
  if (code.includes("INVALID_PARAMS")) {
    return { code: "agora_params", message: "The call could not be set up (invalid call parameters)." };
  }
  if (code.includes("INVALID_TOKEN") || code.includes("TOKEN") || /token/i.test(msg)) {
    return { code: "token", message: "The call could not be authorised. Please try again." };
  }
  return { code: "join_failed", message: "Unable to connect the call. Please check your internet connection and try again." };
}

const inIframe = () => { try { return window.self !== window.top; } catch (e) { return true; } };
const isBrave = () => Boolean(navigator.brave);

/**
 * Restrictive browsers (Brave Shields) answer getUserMedia inside a third-party
 * iframe with NotFoundError even when a microphone exists. Only the top-level
 * page can tell the difference, so ask the Wix widget (parent) to enumerate.
 * Resolves { hasAudioInput, hasVideoInput } or null (not embedded / no answer).
 */
function askParentDevices(timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (!inIframe()) return resolve(null);
    let done = false;
    const finish = (v) => { if (done) return; done = true; window.removeEventListener("message", onMsg); resolve(v); };
    const onMsg = (e) => { if (e.source === window.parent && e.data?.type === "MEDIA_DEVICE_RESULT") finish(e.data); };
    window.addEventListener("message", onMsg);
    try { window.parent.postMessage({ type: "MEDIA_DEVICE_CHECK" }, "*"); } catch (e) { return finish(null); }
    setTimeout(() => finish(null), timeoutMs);
  });
}

/**
 * Probe the media stack with the browser API BEFORE Agora, so the failure
 * reason is exact: embedding policy → permission → no device → device busy.
 * Resolves { ok:true } or { ok:false, code, message, canOpenInTab }.
 */
export async function probeMedia(callType) {
  const wantVideo = callType === "video";
  const embedded = inIframe();
  const hint = embedded
    ? isBrave()
      ? " Brave blocks device access inside embedded pages by default — lower Shields for this site, or open the call in a new tab."
      : " If this keeps happening, open the call in a new tab."
    : "";

  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, code: "not_supported", message: "Your browser does not support calling. Please use a recent version of Chrome, Edge, Safari or Firefox.", canOpenInTab: embedded };
  }
  try {
    const pp = document.permissionsPolicy || document.featurePolicy;
    if (pp?.allowsFeature && (!pp.allowsFeature("microphone") || (wantVideo && !pp.allowsFeature("camera")))) {
      return { ok: false, code: "policy_blocked", message: "This embedded page is not allowed to use the microphone or camera. Open the call in a new tab.", canOpenInTab: embedded };
    }
  } catch (e) { /* not supported → fall through */ }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: wantVideo ? { width: 640, height: 480 } : false });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (err) {
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      return { ok: false, code: "permission_denied", message: (wantVideo ? "Camera and microphone access are required for a video consultation." : "Microphone access is required to start an audio consultation.") + " Allow access in your browser settings and try again." + hint, canOpenInTab: embedded };
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      // Video: retry audio-only so a missing camera does not kill the call.
      if (wantVideo) {
        try {
          const s2 = await navigator.mediaDevices.getUserMedia({ audio: true });
          s2.getTracks().forEach((t) => t.stop());
          return { ok: true, warning: { code: "camera_unavailable", message: "No camera was found — continuing with audio only." } };
        } catch (e) { /* fall through to audio error */ }
      }
      // NotFound inside an iframe is ambiguous: no device, or the browser hiding
      // devices from embedded pages (Brave Shields). Ask the top-level page.
      const parent = await askParentDevices();
      console.warn("[CALL DEBUG] getUserMedia NotFound", { embedded, brave: isBrave(), parentSeesMic: parent?.hasAudioInput ?? "unknown" });
      if (parent?.hasAudioInput) {
        return { ok: true, noAudio: true, warning: { code: "embed_blocked", message: "Your microphone exists, but this browser is blocking embedded pages from using it. You can hear the other participant, but they cannot hear you. Open the call in a new tab to talk" + (isBrave() ? ", or lower Brave Shields for this site and press Retry microphone." : ".") } };
      }
      // Truly no input device: join receive-only and say so.
      return { ok: true, noAudio: true, warning: { code: "no_microphone", message: "No microphone was detected on this device — you can hear the other participant, but they cannot hear you. Connect a microphone and press Retry microphone." + (embedded && parent === null ? hint : "") } };
    }
    if (name === "NotReadableError" || name === "AbortError") {
      return { ok: false, code: "device_busy", message: "Your microphone or camera is already in use by another application or tab. Close it and try again.", canOpenInTab: false };
    }
    return { ok: false, code: "media_failed", message: "Unable to access your microphone or camera." + hint, canOpenInTab: embedded };
  }
}

function bindClientListeners() {
  if (listenersBound) return;
  listenersBound = true;

  client.on("connection-state-change", (cur, prev, reason) => {
    console.log("[CALL] agora state", prev, "→", cur, reason || "");
    dispatchRef?.(callSlice.actions.setAgoraState(cur));
  });

  client.on("user-joined", (user) => {
    console.log("[CALL] remote joined", user.uid);
    dispatchRef?.(callSlice.actions.setRemoteJoined(true));
  });

  client.on("user-left", (user, reason) => {
    console.log("[CALL] remote left", user.uid, reason);
    remoteAudioTrack?.stop();
    remoteAudioTrack = null;
    remoteVideoTrack?.stop();
    remoteVideoTrack = null;
    dispatchRef?.(callSlice.actions.setRemoteJoined(false));
    dispatchRef?.(callSlice.actions.setRemoteMedia({ audio: false, video: false }));
  });

  client.on("user-published", async (user, mediaType) => {
    try {
      await client.subscribe(user, mediaType);
      if (mediaType === "audio") {
        remoteAudioTrack = user.audioTrack;
        if (speakerId && remoteAudioTrack?.setPlaybackDevice) { try { await remoteAudioTrack.setPlaybackDevice(speakerId); } catch (e) { /* keep default */ } }
        remoteAudioTrack?.play();
        dispatchRef?.(callSlice.actions.setRemoteMedia({ audio: true }));
      } else if (mediaType === "video") {
        remoteVideoTrack = user.videoTrack;
        dispatchRef?.(callSlice.actions.setRemoteMedia({ video: true }));
        window.dispatchEvent(new Event("remote-video-ready"));
      }
    } catch (err) {
      console.error("[CALL ERROR] subscribe failed:", err?.message);
    }
  });

  client.on("user-unpublished", (user, mediaType) => {
    if (mediaType === "audio") {
      remoteAudioTrack?.stop();
      remoteAudioTrack = null;
      dispatchRef?.(callSlice.actions.setRemoteMedia({ audio: false }));
    } else if (mediaType === "video") {
      remoteVideoTrack?.stop();
      remoteVideoTrack = null;
      dispatchRef?.(callSlice.actions.setRemoteMedia({ video: false }));
    }
  });

  // Token renewal: the server mints a fresh token for the same call/uid.
  client.on("token-privilege-will-expire", async () => {
    console.log("[CALL] token about to expire → renewing");
    try {
      const fresh = await renewTokenFn?.();
      if (fresh) await client.renewToken(fresh);
    } catch (err) {
      console.error("[CALL ERROR] token renewal failed:", err?.message);
    }
  });
  client.on("token-privilege-did-expire", async () => {
    console.warn("[CALL] token expired");
    try {
      const fresh = await renewTokenFn?.();
      if (fresh) await client.renewToken(fresh);
    } catch (err) {
      dispatchRef?.(callSlice.actions.setMediaError({ code: "token", message: "The call authorisation expired." }));
    }
  });
}

async function releaseLocalTracks() {
  for (const t of [localAudioTrack, localVideoTrack]) {
    try { t?.stop(); t?.close(); } catch (e) { /* ignore */ }
  }
  localAudioTrack = null;
  localVideoTrack = null;
}

/**
 * Join the Agora channel and publish local media.
 * Audio call: mic on. Video call: mic + camera on; if the camera is unavailable
 * the call continues audio-only and `warning` says why.
 */
export const joinCall = createAsyncThunk(
  "call/join",
  async ({ appId, channel, token, uid, callType = "voice", renewToken }, { dispatch, rejectWithValue }) => {
    dispatchRef = dispatch;
    renewTokenFn = renewToken || null;
    bindClientListeners();
    const numericUid = Number(uid);
    let warning = null;
    try {
      if (!appId || !channel || !token) throw new Error("Missing Agora credentials");
      if (client.connectionState !== "DISCONNECTED") {
        try { await client.leave(); } catch (e) { /* ignore */ }
      }
      await releaseLocalTracks();

      // Probe with the browser API first: exact reason, and a permission failure
      // never joins a channel.
      const probe = await probeMedia(callType);
      if (!probe.ok) {
        console.error("[CALL ERROR] media probe:", probe.code);
        return rejectWithValue(probe);
      }
      if (probe.warning) warning = probe.warning;
      if (!probe.noAudio) {
        try {
          localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        } catch (err) {
          const d = describeMediaError(err, callType);
          console.error("[CALL ERROR] microphone:", d.code);
          return rejectWithValue({ ...d, canOpenInTab: inIframe() });
        }
      }
      if (callType === "video") {
        try {
          localVideoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: { width: 640, height: 480, frameRate: 15, bitrateMin: 300, bitrateMax: 900 },
          });
        } catch (err) {
          const d = describeMediaError(err, "video");
          console.warn("[CALL] camera unavailable, continuing audio-only:", d.code);
          warning = { code: "camera_unavailable", message: "Your camera is unavailable — continuing with audio only." };
          localVideoTrack = null;
        }
      }

      console.log("[AGORA DEBUG] join →", { appId: String(appId).slice(0, 6) + "…", channel, uid: numericUid, tokenLength: String(token).length, callType, tracks: { audio: Boolean(localAudioTrack), video: Boolean(localVideoTrack) } });
      await client.join(appId, channel, token, numericUid);
      console.log("[AGORA DEBUG] joined", { channel, uid: client.uid, state: client.connectionState });
      const tracks = [localAudioTrack, localVideoTrack].filter(Boolean);
      // Receive-only participants (no mic/camera) must not call publish([]) —
      // the SDK rejects an empty list, which is what produced "Unable to connect".
      if (tracks.length) {
        await client.publish(tracks);
        console.log("[AGORA DEBUG] published", tracks.map((t) => t.trackMediaType));
      } else {
        console.log("[AGORA DEBUG] receive-only: nothing to publish");
      }
      return { channel, callType, hasVideo: Boolean(localVideoTrack), hasAudio: Boolean(localAudioTrack), warning };
    } catch (err) {
      await releaseLocalTracks();
      try { if (client.connectionState !== "DISCONNECTED") await client.leave(); } catch (e) { /* ignore */ }
      const d = describeMediaError(err, callType);
      console.error("[CALL ERROR] join failed:", err?.code || err?.name, err?.message);
      return rejectWithValue({ ...d, canOpenInTab: inIframe(), details: `${err?.code || err?.name || "ERROR"}: ${err?.message || ""}`.slice(0, 300) });
    }
  },
);

/**
 * Mid-call: try again to get a microphone (after plugging one in or lowering
 * Shields) and publish it without leaving the channel.
 */
export const enableMicrophone = createAsyncThunk("call/enableMicrophone", async (_, { rejectWithValue }) => {
  if (localAudioTrack) return { ok: true };
  if (client.connectionState !== "CONNECTED") return rejectWithValue({ code: "not_connected", message: "Not connected yet — try again in a moment." });
  const probe = await probeMedia("voice");
  if (!probe.ok) return rejectWithValue(probe);
  if (probe.noAudio) return rejectWithValue(probe.warning);
  try {
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await client.publish([localAudioTrack]);
    console.log("[AGORA DEBUG] microphone published after retry");
    return { ok: true };
  } catch (err) {
    try { localAudioTrack?.close(); } catch (e) { /* ignore */ }
    localAudioTrack = null;
    const d = describeMediaError(err, "voice");
    console.error("[CALL ERROR] enable microphone failed:", err?.code || err?.name, err?.message);
    return rejectWithValue({ ...d, details: `${err?.code || err?.name || "ERROR"}: ${err?.message || ""}`.slice(0, 300) });
  }
});

/** Switch the microphone without republishing. */
export const setMicrophoneDevice = createAsyncThunk("call/setMicrophone", async (deviceId, { rejectWithValue }) => {
  try {
    if (localAudioTrack && deviceId) await localAudioTrack.setDevice(deviceId);
    console.log("[CALL DEBUG] microphone switched");
    return deviceId;
  } catch (err) { return rejectWithValue(err?.message || "mic"); }
});

/** Choose the speaker (Chrome/Edge expose audiooutput devices). */
export const setSpeakerDevice = createAsyncThunk("call/setSpeaker", async (deviceId, { rejectWithValue }) => {
  try {
    speakerId = deviceId || null;
    if (remoteAudioTrack?.setPlaybackDevice && deviceId) await remoteAudioTrack.setPlaybackDevice(deviceId);
    console.log("[CALL DEBUG] speaker switched");
    return deviceId;
  } catch (err) { return rejectWithValue(err?.message || "speaker"); }
});

export const leaveCall = createAsyncThunk("call/leave", async () => {
  remoteAudioTrack?.stop();
  remoteVideoTrack?.stop();
  remoteAudioTrack = null;
  remoteVideoTrack = null;
  await releaseLocalTracks();
  speakerId = null;
  try {
    if (client.connectionState !== "DISCONNECTED") await client.leave();
  } catch (e) { /* ignore */ }
  console.log("[CALL] left channel");
});

const initialState = {
  phase: "idle", // idle | joining | joined | failed
  agoraState: "DISCONNECTED",
  channel: null,
  callType: null,
  muted: false,
  videoEnabled: false,
  hasLocalVideo: false,
  hasLocalAudio: false,
  remoteJoined: false,
  remoteAudioOn: false,
  remoteVideoOn: false,
  mediaError: null,
  mediaWarning: null,
  micRetrying: false,
  micId: "",
  speakerId: "",
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    setAgoraState: (state, action) => { state.agoraState = action.payload; },
    setRemoteJoined: (state, action) => { state.remoteJoined = Boolean(action.payload); },
    setRemoteMedia: (state, action) => {
      const p = action.payload || {};
      if (p.audio !== undefined) state.remoteAudioOn = p.audio;
      if (p.video !== undefined) state.remoteVideoOn = p.video;
    },
    setMediaError: (state, action) => { state.mediaError = action.payload; },
    toggleMute: (state) => {
      if (!localAudioTrack) return;
      state.muted = !state.muted;
      localAudioTrack?.setEnabled(!state.muted);
    },
    toggleVideo: (state) => {
      if (!localVideoTrack) return;
      state.videoEnabled = !state.videoEnabled;
      localVideoTrack.setEnabled(state.videoEnabled);
    },
    resetCallMedia: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(joinCall.pending, (state) => {
        state.phase = "joining";
        state.mediaError = null;
        state.mediaWarning = null;
      })
      .addCase(joinCall.fulfilled, (state, action) => {
        state.phase = "joined";
        state.channel = action.payload.channel;
        state.callType = action.payload.callType;
        state.hasLocalVideo = action.payload.hasVideo;
        state.hasLocalAudio = action.payload.hasAudio;
        state.videoEnabled = action.payload.hasVideo;
        state.muted = false;
        state.mediaWarning = action.payload.warning || null;
      })
      .addCase(joinCall.rejected, (state, action) => {
        state.phase = "failed";
        state.mediaError = action.payload || { code: "join_failed", message: "Unable to connect the call." };
      })
      .addCase(enableMicrophone.pending, (state) => { state.micRetrying = true; })
      .addCase(enableMicrophone.fulfilled, (state) => {
        state.micRetrying = false;
        state.hasLocalAudio = true;
        state.muted = false;
        state.mediaWarning = null;
      })
      .addCase(enableMicrophone.rejected, (state, action) => {
        state.micRetrying = false;
        if (action.payload?.message) state.mediaWarning = { code: action.payload.code || "no_microphone", message: action.payload.message };
      })
      .addCase(setMicrophoneDevice.fulfilled, (state, action) => { state.micId = action.payload || ""; })
      .addCase(setSpeakerDevice.fulfilled, (state, action) => { state.speakerId = action.payload || ""; })
      .addCase(leaveCall.fulfilled, () => initialState);
  },
});

export const { toggleMute, toggleVideo, resetCallMedia, setMediaError } = callSlice.actions;
export default callSlice.reducer;
