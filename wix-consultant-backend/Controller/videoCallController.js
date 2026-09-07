const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const { default: mongoose } = require("mongoose");
const { User } = require("../Modal/userSchema");
const callSession = require("../services/callSession");

const bad = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const parseBody = (req) => {
  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b || "{}"); } catch (e) { b = {}; } }
  return b;
};

/* ── Legacy token endpoint (kept for compatibility) ───────────── */
const generateToken = async (req, res) => {
  try {
    const { channelName, uid } = req.body;
    if (!channelName || uid === undefined) return res.status(400).json({ error: "channelName and uid are required" });
    if (!process.env.AGORA_APP_ID || !process.env.AGORA_APP_CERTIFICATE) return res.status(500).json({ error: "Agora credentials not configured" });
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600;
    const token = RtcTokenBuilder.buildTokenWithUid(process.env.AGORA_APP_ID, process.env.AGORA_APP_CERTIFICATE, channelName, Number(uid), RtcRole.PUBLISHER, privilegeExpiredTs);
    res.json({ token, appId: process.env.AGORA_APP_ID, channelName, uid });
  } catch (error) {
    console.error("[CALL ERROR] generateToken:", error.message);
    res.status(500).json({ error: "Failed to generate token" });
  }
};

const getCaller_Receiver_Details = async (req, res) => {
  try {
    const { callerId, receiverId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(callerId) || !mongoose.Types.ObjectId.isValid(receiverId)) return res.status(400).json({ error: "Invalid callerId or receiverId" });
    const [caller, receiver] = await Promise.all([User.findById(callerId), User.findById(receiverId)]);
    if (!caller || !receiver) return res.status(400).json({ error: "Caller or receiver not found" });
    res.status(200).json({
      success: true,
      payload: {
        caller: { _id: caller._id, fullname: caller.fullname, fees: caller.fees, profileImage: caller.profileImage },
        receiver: { _id: receiver._id, fullname: receiver.fullname, fees: receiver.fees, profileImage: receiver.profileImage },
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get caller and receiver details" });
  }
};

/* ── Lifecycle (all delegate to services/callSession.js) ──────── */

/** POST /api/call/request  { callerId, receiverId, callType, shopId } */
const requestCall = async (req, res) => {
  try {
    const { callerId, receiverId, callType, shopId } = parseBody(req);
    const r = await callSession.requestCall({ callerId, receiverId, callType, shopId });
    if (!r.ok) {
      const status = r.code === "insufficient_balance" ? 402 : r.code === "consultant_busy" || r.code === "caller_busy" || r.code === "consultant_offline" ? 409 : 400;
      return bad(res, status, r.message || r.code, { code: r.code, required: r.required, available: r.available, callId: r.callId });
    }
    return res.status(200).json({ success: true, call: r.session });
  } catch (error) {
    console.error("[CALL ERROR] requestCall:", error.message);
    return bad(res, 500, "Server error");
  }
};

const byUser = (handler) => async (req, res) => {
  try {
    const { callId } = req.params;
    const { userId } = parseBody(req);
    if (!mongoose.Types.ObjectId.isValid(callId) || !mongoose.Types.ObjectId.isValid(userId || "")) return bad(res, 400, "Invalid IDs");
    const r = await handler({ callId, userId });
    if (!r.ok) return bad(res, r.code === "not_found" ? 404 : 409, r.error || r.code || "Rejected", { code: r.code, session: r.session });
    return res.status(200).json({ success: true, ...r });
  } catch (error) {
    console.error("[CALL ERROR]", error.message);
    return bad(res, 500, "Server error");
  }
};

const acceptCall = byUser(({ callId, userId }) => callSession.acceptCall({ callId, by: userId }));
const rejectCall = byUser(({ callId, userId }) => callSession.rejectCall({ callId, by: userId }));
const cancelCall = byUser(({ callId, userId }) => callSession.cancelCall({ callId, by: userId }));
const joinedCall = byUser(({ callId, userId }) => callSession.markJoined({ callId, userId }));
const failCall = byUser(({ callId, userId }) => callSession.failCall({ callId, by: userId, reason: "media_failure" }));
/** Idempotent; accepts text/plain (sendBeacon). */
const endCall = byUser(({ callId, userId }) => callSession.endAndBroadcast({ callId, endedBy: userId, endReason: "ended" }));
const callToken = byUser(({ callId, userId }) => callSession.issueToken({ callId, userId }));

/** GET /api/call/active-session/:userId */
const activeSession = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return bad(res, 400, "Invalid user ID");
    const s = await callSession.getActiveCallForUser(userId);
    if (!s) return res.status(200).json({ success: true, hasActiveCall: false, call: null });
    const parties = await callSession.withParties(s);
    const role = String(s.callerId) === String(userId) ? "user" : "consultant";
    const tabAttached = await callSession.isTabAttached(userId, s._id);
    return res.status(200).json({
      success: true,
      hasActiveCall: true,
      call: {
        ...callSession.snapshot(s, {
          role,
          participant: role === "user" ? parties.receiver : parties.caller,
          ratePerMinute: parties.ratePerMinute,
        }),
        // true while this user's dedicated call tab holds an attached socket —
        // the original page uses it instead of cross-tab messaging (which the
        // browser partitions for embedded pages).
        tabAttached,
      },
    });
  } catch (error) {
    console.error("[CALL ERROR] activeSession:", error.message);
    return bad(res, 500, "Server error");
  }
};

module.exports = {
  generateToken,
  getCaller_Receiver_Details,
  requestCall,
  acceptCall,
  rejectCall,
  cancelCall,
  joinedCall,
  failCall,
  endCall,
  callToken,
  activeSession,
};
