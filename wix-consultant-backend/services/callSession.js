/**
 * Call session lifecycle (audio + video) — the ONE authoritative implementation.
 *
 *   requested → ringing → accepted → connecting → active → ending → completed
 *                  ├── cancelled (caller hung up before accept)
 *                  ├── rejected  (consultant declined)
 *                  ├── missed    (ring timeout / consultant offline)
 *                  └── failed    (media/token failure before active)
 *
 * Record: CallSession (Modal/callSessions.js). Money: TransactionHistroy, created
 * ONLY when the call becomes active (both sides joined Agora) — never while ringing.
 * connectedAt is the billing start; server timestamps only.
 *
 * Idempotency: endCallSession() takes an atomic "ending" lock. Every other end
 * path (peer, grace timer, watchdog, REST retry, recovery) gets the existing
 * result. Nothing is billed twice; the user is never billed below zero.
 */
const mongoose = require("mongoose");
const crypto = require("crypto");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const { CallSession } = require("../Modal/callSessions");
const { TransactionHistroy } = require("../Modal/transactionHistroy");
const { User } = require("../Modal/userSchema");
const { shopModel } = require("../Modal/shopify");
const { WalletHistory } = require("../Modal/walletHistory");
const { missCalled } = require("../Modal/miscallasHistroy");
const { formatTime } = require("../Helper/helper");

const GRACE_MS = Number(process.env.CALL_GRACE_MS) || 20000;
const RING_TIMEOUT_MS = Number(process.env.CALL_RING_TIMEOUT_MS) || 30000;
const TOKEN_TTL_SEC = Number(process.env.AGORA_TOKEN_TTL_SEC) || 7200;
const WARN_AT_SEC = [30, 10];

let ioRef = null;
let onlineRef = null;
const ringTimers = new Map(); // callId → timer
const graceTimers = new Map(); // callId → { timer, role }
const watchdogs = new Map(); // callId → [timers]

function setIo(io, onlineUsers) {
  ioRef = io;
  onlineRef = onlineUsers;
}

function emitTo(userId, event, payload) {
  if (!ioRef || !userId) return;
  const uid = String(userId);
  ioRef.to(uid).emit(event, payload);
  const sid = onlineRef?.get(uid);
  if (sid) {
    const sock = ioRef.sockets?.sockets?.get(sid);
    if (sock && !sock.rooms?.has(uid)) sock.emit(event, payload);
  }
}

const idOf = (v) => String(v && v._id ? v._id : v);
const round2 = (n) => Number((Math.round(Number(n) * 100) / 100).toFixed(2));
const isOnline = (uid) => Boolean(onlineRef?.has(String(uid)));
const ratePerMinute = (consultant, callType) =>
  Number(callType === "video" ? consultant?.videoPerMinute : consultant?.voicePerMinute) || 0;

/** Stable Agora uid per user per call (rejoin after refresh reuses it → Agora replaces the stale peer). */
function agoraUidFor(userId, channelName) {
  const h = crypto.createHash("sha1").update(`${userId}:${channelName}`).digest();
  return (h.readUInt32BE(0) % 2000000000) + 1;
}

function snapshot(s, extra = {}) {
  return {
    callId: String(s._id),
    callType: s.callType,
    status: s.status,
    channelName: s.sessionId,
    userId: idOf(s.callerId),
    consultantId: idOf(s.receiverId),
    shopId: s.shopId ? String(s.shopId) : null,
    transactionId: s.transtionId ? String(s.transtionId) : null,
    requestedAt: s.requestedAt || s.createdAt || null,
    acceptedAt: s.acceptedAt || null,
    startedAt: s.connectedAt || null,
    endedAt: s.endTime || null,
    endedBy: s.endedBy || null,
    endReason: s.endReason || null,
    durationSeconds: s.totalSeconds ?? null,
    finalAmount: s.amount ?? null,
    consultantShare: s.consultantShare ?? null,
    userConnected: s.userConnected !== false,
    consultantConnected: s.consultantConnected !== false,
    ...extra,
  };
}

async function withParties(s) {
  const [caller, receiver] = await Promise.all([
    User.findById(idOf(s.callerId)).select("fullname profileImage walletBalance").lean(),
    User.findById(idOf(s.receiverId)).select("fullname profileImage voicePerMinute videoPerMinute").lean(),
  ]);
  return {
    caller: caller ? { id: String(caller._id), fullname: caller.fullname, profileImage: caller.profileImage } : null,
    receiver: receiver ? { id: String(receiver._id), fullname: receiver.fullname, profileImage: receiver.profileImage } : null,
    ratePerMinute: ratePerMinute(receiver, s.callType),
  };
}

const LIVE = ["ringing", "accepted", "connecting", "active", "ending"];
const BILLABLE_LOCK = ["accepted", "connecting", "active"];

async function getActiveCallForUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  return CallSession.findOne({
    status: { $in: LIVE },
    $or: [{ callerId: userId }, { receiverId: userId }],
  }).sort({ createdAt: -1 });
}

async function consultantBusy(consultantId) {
  const call = await CallSession.findOne({ status: { $in: LIVE }, $or: [{ receiverId: consultantId }, { callerId: consultantId }] }).select("_id");
  if (call) return "in_call";
  const chat = await TransactionHistroy.findOne({ type: "chat", status: { $in: ["active", "ending"] }, receiverId: consultantId }).select("_id");
  if (chat) return "in_chat";
  return null;
}

/* ── 1. request ─────────────────────────────────────────────── */

async function requestCall({ callerId, receiverId, callType = "voice", shopId, channelName }) {
  const type = callType === "video" ? "video" : "voice";
  if (![callerId, receiverId].every((v) => mongoose.Types.ObjectId.isValid(v))) return { ok: false, code: "invalid_ids", message: "Invalid participants" };
  const [caller, consultant] = await Promise.all([User.findById(callerId), User.findById(receiverId)]);
  if (!caller || !consultant) return { ok: false, code: "not_found", message: "Participant not found" };
  if (consultant.userType !== "consultant") return { ok: false, code: "not_consultant", message: "Selected user is not a consultant" };

  const rate = ratePerMinute(consultant, type);
  const balance = Number(caller.walletBalance) || 0;
  if (rate > 0 && balance < rate) {
    return { ok: false, code: "insufficient_balance", message: "Insufficient credits. Please add credits before starting a consultation.", required: rate, available: balance };
  }
  if (await getActiveCallForUser(callerId)) return { ok: false, code: "caller_busy", message: "You already have a call in progress." };
  const busy = await consultantBusy(receiverId);
  if (busy) return { ok: false, code: "consultant_busy", message: "Consultant is currently unavailable. Please try again shortly." };

  let shop = null;
  if (shopId && mongoose.Types.ObjectId.isValid(shopId)) shop = await shopModel.findById(shopId).select("_id").lean();
  if (!shop && shopId) shop = await shopModel.findOne({ $or: [{ shop_Domain: shopId }, { instanceId: shopId }] }).select("_id").lean();
  if (!shop && consultant.shop_id && mongoose.Types.ObjectId.isValid(consultant.shop_id)) shop = { _id: consultant.shop_id };
  if (!shop) return { ok: false, code: "shop_not_found", message: "Store not found for this consultant" };

  const channel = channelName || `call-${String(callerId).slice(-6)}-${String(receiverId).slice(-6)}-${Date.now().toString(36)}`;
  const now = new Date();
  const s = await CallSession.create({
    sessionId: channel,
    callerId,
    receiverId,
    callType: type,
    shopId: String(shop._id),
    status: "ringing",
    requestedAt: now,
    ringingAt: now,
    userConnected: true,
    consultantConnected: isOnline(receiverId),
  });
  const callId = String(s._id);
  console.log("[CALL] Session created", { callId, callType: type, userId: String(callerId), consultantId: String(receiverId) });

  const parties = await withParties(s);
  const incoming = {
    callId,
    callerId: String(callerId),
    callerName: parties.caller?.fullname || "Client",
    callerAvatar: parties.caller?.profileImage || null,
    callType: type,
    channelName: channel,
    shop: String(shop._id),
    ringTimeoutMs: RING_TIMEOUT_MS,
  };

  if (!isOnline(receiverId)) {
    await CallSession.updateOne({ _id: callId }, { $set: { status: "missed", endReason: "receiver_offline", endTime: new Date() } });
    await missCalled.create({ senderId: callerId, receiverId, type, reason: "offline" }).catch(() => {});
    console.log("[CALL] Consultant offline → missed", { callId });
    emitTo(callerId, "call-receiver-offline", { callId, receiverId: String(receiverId), channelName: channel });
    return { ok: false, code: "consultant_offline", message: "Consultant is not available right now.", callId };
  }

  emitTo(receiverId, "incoming-call", incoming);
  emitTo(callerId, "callRinging", { callId, channelName: channel, callType: type, ringTimeoutMs: RING_TIMEOUT_MS });
  console.log("[CALL] Consultant notified (incoming-call)", { callId });
  scheduleRingTimeout(callId);
  return { ok: true, session: snapshot(s, { counterpart: parties.receiver, ratePerMinute: parties.ratePerMinute }) };
}

function scheduleRingTimeout(callId, ms = RING_TIMEOUT_MS) {
  cancelRing(callId);
  ringTimers.set(String(callId), setTimeout(() => onRingTimeout(callId), ms));
}
function cancelRing(callId) {
  const t = ringTimers.get(String(callId));
  if (t) { clearTimeout(t); ringTimers.delete(String(callId)); }
}
async function onRingTimeout(callId) {
  ringTimers.delete(String(callId));
  const s = await CallSession.findOneAndUpdate(
    { _id: callId, status: "ringing" },
    { $set: { status: "missed", endReason: "no_answer", endTime: new Date() } },
    { new: true },
  );
  if (!s) return;
  console.log("[CALL] Ring timeout → missed", { callId: String(callId) });
  await missCalled.create({ senderId: s.callerId, receiverId: s.receiverId, type: s.callType, reason: "timeout" }).catch(() => {});
  const payload = { callId: String(callId), reason: "no_answer" };
  emitTo(s.callerId, "callMissed", payload);
  emitTo(s.receiverId, "callMissed", payload);
  emitTo(s.callerId, "call-missed", payload); // legacy
  emitTo(s.receiverId, "call-missed", payload);
}

/* ── 2. cancel / reject / accept ───────────────────────────── */

async function cancelCall({ callId, by }) {
  const s = await CallSession.findOneAndUpdate(
    { _id: callId, status: "ringing", callerId: by },
    { $set: { status: "cancelled", endReason: "cancelled_by_caller", endedBy: String(by), endTime: new Date() } },
    { new: true },
  );
  if (!s) return { ok: false, code: "not_ringing" };
  cancelRing(callId);
  console.log("[CALL] Cancelled by caller", { callId: String(callId) });
  const payload = { callId: String(callId), reason: "cancelled_by_caller" };
  emitTo(s.receiverId, "callCancelled", payload);
  emitTo(s.callerId, "callCancelled", payload);
  return { ok: true, session: snapshot(s) };
}

async function rejectCall({ callId, by }) {
  const s = await CallSession.findOneAndUpdate(
    { _id: callId, status: "ringing", receiverId: by },
    { $set: { status: "rejected", endReason: "rejected_by_consultant", endedBy: String(by), endTime: new Date() } },
    { new: true },
  );
  if (!s) return { ok: false, code: "not_ringing" };
  cancelRing(callId);
  console.log("[CALL] Rejected by consultant", { callId: String(callId) });
  await missCalled.create({ senderId: s.callerId, receiverId: s.receiverId, type: s.callType, reason: "rejected" }).catch(() => {});
  const payload = { callId: String(callId), reason: "rejected_by_consultant", callerId: idOf(s.callerId), receiverId: idOf(s.receiverId), channelName: s.sessionId, callType: s.callType };
  emitTo(s.callerId, "callRejected", payload);
  emitTo(s.receiverId, "callRejected", payload);
  emitTo(s.callerId, "call-ended-rejected", payload); // legacy
  return { ok: true, session: snapshot(s) };
}

async function acceptCall({ callId, by }) {
  const s = await CallSession.findOneAndUpdate(
    { _id: callId, status: "ringing", receiverId: by },
    { $set: { status: "accepted", acceptedAt: new Date(), consultantConnected: true } },
    { new: true },
  );
  if (!s) {
    const existing = await CallSession.findById(callId);
    return { ok: false, code: existing ? `call_${existing.status}` : "not_found", session: existing ? snapshot(existing) : null };
  }
  cancelRing(callId);
  console.log("[CALL] Call accepted", { callId: String(callId), consultantId: String(by) });
  const parties = await withParties(s);
  const payload = { ...snapshot(s), counterpart: parties.caller };
  emitTo(s.callerId, "callAccepted", payload);
  emitTo(s.receiverId, "callAccepted", { ...snapshot(s), counterpart: parties.receiver });
  return { ok: true, session: payload };
}

/* ── 3. joined (Agora) → active + billing start ────────────── */

async function markJoined({ callId, userId }) {
  const s = await CallSession.findById(callId);
  if (!s) return { ok: false, code: "not_found" };
  const role = idOf(s.callerId) === String(userId) ? "user" : idOf(s.receiverId) === String(userId) ? "consultant" : null;
  if (!role) return { ok: false, code: "not_a_participant" };
  if (s.status === "active") return { ok: true, session: snapshot(s), alreadyActive: true };
  if (!["accepted", "connecting"].includes(s.status)) return { ok: false, code: `call_${s.status}`, session: snapshot(s) };

  await CallSession.updateOne({ _id: callId }, { $set: { [`${role}Joined`]: true, status: "connecting", [`${role}Connected`]: true } });
  console.log(`[CALL] ${role} joined Agora`, { callId: String(callId) });
  const fresh = await CallSession.findById(callId);
  if (fresh.userJoined && fresh.consultantJoined) return activateCall(callId);
  return { ok: true, session: snapshot(fresh) };
}

async function activateCall(callId) {
  const now = new Date();
  const s = await CallSession.findOneAndUpdate(
    { _id: callId, status: "connecting", userJoined: true, consultantJoined: true },
    { $set: { status: "active", connectedAt: now, startTime: now } },
    { new: true },
  );
  if (!s) {
    const existing = await CallSession.findById(callId);
    return { ok: true, session: snapshot(existing), alreadyActive: existing?.status === "active" };
  }
  const tx = await TransactionHistroy.create({
    senderId: s.callerId,
    receiverId: s.receiverId,
    shop_id: s.shopId,
    startTime: now,
    status: "active",
    type: s.callType,
    userConnected: true,
    consultantConnected: true,
  });
  await CallSession.updateOne({ _id: callId }, { $set: { transtionId: String(tx._id) } });
  s.transtionId = String(tx._id);
  console.log("[CALL] Agora connected on both sides → ACTIVE, billing started", { callId: String(callId), transactionId: String(tx._id), startedAt: now.toISOString() });
  const payload = snapshot(s);
  emitTo(s.callerId, "callConnected", payload);
  emitTo(s.receiverId, "callConnected", payload);
  // legacy events for any old client still listening
  const legacy = { callerId: payload.userId, receiverId: payload.consultantId, channelName: s.sessionId, callType: s.callType, transactionId: payload.transactionId, shopId: payload.shopId, startedAt: now.getTime() };
  emitTo(s.callerId, "call-accepted-started", legacy);
  emitTo(s.receiverId, "call-accepted-started", legacy);
  await armWatchdog(callId);
  return { ok: true, session: payload, activated: true };
}

/* ── 4. end (exactly once) ─────────────────────────────────── */

async function endCallSession({ callId, endedBy = "system", endReason = "ended" }) {
  const cid = String(callId || "");
  if (!mongoose.Types.ObjectId.isValid(cid)) return { ok: false, error: "invalid callId" };

  const locked = await CallSession.findOneAndUpdate(
    { _id: cid, status: { $in: BILLABLE_LOCK } },
    { $set: { status: "ending", endedBy: String(endedBy), endReason } },
    { new: true },
  );
  if (!locked) {
    const existing = await CallSession.findById(cid);
    if (!existing) return { ok: false, error: "session not found" };
    if (existing.status === "ringing") {
      // Hanging up while ringing: caller → cancel, consultant → reject.
      const byCaller = idOf(existing.callerId) === String(endedBy);
      const r = byCaller ? await cancelCall({ callId: cid, by: endedBy }) : await rejectCall({ callId: cid, by: endedBy });
      return r.ok ? { ok: true, session: r.session, notBilled: true } : { ok: false, error: r.code };
    }
    if (existing.status === "ending") return { ok: true, inProgress: true, session: snapshot(existing) };
    return { ok: true, alreadyEnded: true, session: snapshot(existing) };
  }

  cancelRing(cid);
  cancelGrace(cid);
  cancelWatchdog(cid);
  const userId = idOf(locked.callerId);
  const consultantId = idOf(locked.receiverId);
  const shopId = String(locked.shopId);
  console.log("[CALL] Ending session", { callId: cid, userId, consultantId, endedBy, endReason, wasActive: Boolean(locked.connectedAt) });

  // Never reached active → nothing to bill.
  if (!locked.connectedAt) {
    const endTime = new Date();
    await CallSession.updateOne({ _id: cid }, { $set: { status: "completed", endTime, totalSeconds: 0, amount: 0, consultantShare: 0, adminShare: 0, billingStatus: "none", userConnected: false, consultantConnected: false } });
    const fresh = await CallSession.findById(cid);
    console.log("[CALL] Session ended before connect — no charge", { callId: cid });
    return { ok: true, session: snapshot(fresh, { remainingBalance: null }), notBilled: true };
  }

  const session = await mongoose.startSession();
  try {
    let result = null;
    await session.withTransaction(async () => {
      const s = await CallSession.findById(cid).session(session);
      const tx = s.transtionId ? await TransactionHistroy.findById(s.transtionId).session(session) : null;
      const [user, consultant, shop] = await Promise.all([
        User.findById(userId).session(session),
        User.findById(consultantId).session(session),
        shopModel.findById(shopId).session(session),
      ]);
      if (!s || !user || !consultant || !shop) throw new Error("session parties not found");

      const endTime = new Date();
      const totalSeconds = Math.max(0, Math.floor((endTime - new Date(s.connectedAt)) / 1000));
      // Existing business rule preserved: per-second proration of the per-minute rate.
      const perSecond = ratePerMinute(consultant, s.callType) / 60;
      const raw = round2(totalSeconds * perSecond);
      const available = Math.max(0, Number(user.walletBalance) || 0);
      const amount = Math.min(raw, available);
      const adminShare = round2((amount * Number(shop.adminPersenTage || 0)) / 100);
      const consultantShare = round2(amount - adminShare);
      console.log("[BILLING] Calculating final charge", { callId: cid, totalSeconds, perMinute: ratePerMinute(consultant, s.callType), raw, available, amount });

      s.status = "completed";
      s.endTime = endTime;
      s.totalSeconds = totalSeconds;
      s.amount = amount;
      s.consultantShare = consultantShare;
      s.adminShare = adminShare;
      s.billingStatus = "finalized";
      s.billingFinalizedAt = endTime;
      s.userConnected = false;
      s.consultantConnected = false;
      await s.save({ session });

      if (tx) {
        tx.endTime = endTime;
        tx.totalSeconds = totalSeconds;
        tx.amount = amount;
        tx.adminAmount = adminShare;
        tx.consultantAmount = consultantShare;
        tx.status = "completed";
        tx.endedBy = String(endedBy);
        tx.endReason = endReason;
        tx.billingFinalizedAt = endTime;
        await tx.save({ session });
      }
      if (amount > 0) {
        await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -amount } }, { session });
        await User.findByIdAndUpdate(consultantId, { $inc: { walletBalance: consultantShare } }, { session });
        await shopModel.findByIdAndUpdate(shopId, { $inc: { adminWalletBalance: adminShare } }, { session });
      }
      const description = `${s.callType === "video" ? "Video" : "Audio"} call for ${formatTime(totalSeconds)} minutes`;
      await WalletHistory.create(
        [
          { userId, shop_id: shopId, amount, transactionType: "usage", referenceType: s.callType, referenceId: tx?._id || s._id, direction: "debit", description, status: "success" },
          { userId: consultantId, shop_id: shopId, amount: consultantShare, transactionType: "usage", referenceType: s.callType, referenceId: tx?._id || s._id, direction: "credit", description, status: "success" },
        ],
        { session, ordered: true },
      );
      const remaining = round2(available - amount);
      console.log("[BILLING] Wallet deducted", { callId: cid, user: -amount, consultant: consultantShare, admin: adminShare, remainingBalance: remaining });
      result = snapshot(s, { remainingBalance: remaining });
    });
    console.log("[BILLING] Finalized successfully", { callId: cid, endReason });
    return { ok: true, session: result };
  } catch (error) {
    await CallSession.updateOne({ _id: cid, status: "ending" }, { $set: { status: "active" } });
    console.error("[CALL ERROR] endCallSession failed, lock released", { callId: cid, error: error.message });
    return { ok: false, error: error.message };
  } finally {
    session.endSession();
  }
}

function broadcastEnded(sessionInfo) {
  if (!sessionInfo) return;
  const payload = {
    ...sessionInfo,
    // legacy fields
    trnaID: sessionInfo.transactionId,
    totalSeconds: sessionInfo.durationSeconds,
    totalAmount: sessionInfo.finalAmount,
    reason: sessionInfo.endReason,
    callerId: sessionInfo.userId,
    receiverId: sessionInfo.consultantId,
  };
  emitTo(sessionInfo.userId, "callEnded", payload);
  emitTo(sessionInfo.consultantId, "callEnded", payload);
}

async function endAndBroadcast(args) {
  const r = await endCallSession(args);
  if (r.ok && r.session && !r.inProgress) broadcastEnded(r.session);
  return r;
}

/* ── 5. disconnect grace ───────────────────────────────────── */

function roleFor(s, userId) {
  if (idOf(s.callerId) === String(userId)) return "user";
  if (idOf(s.receiverId) === String(userId)) return "consultant";
  return null;
}

async function markDisconnected(userId) {
  const s = await getActiveCallForUser(userId);
  if (!s) return null;
  const role = roleFor(s, userId);
  if (!role) return null;
  const cid = String(s._id);
  if (s.status === "ringing") {
    if (role === "user") return cancelCall({ callId: cid, by: userId }); // caller left while ringing
    return null; // consultant dropped while ringing → ring timeout handles it
  }
  if (!BILLABLE_LOCK.includes(s.status)) return null;
  await CallSession.updateOne({ _id: cid }, { $set: { [`${role}Connected`]: false, [`${role}DisconnectedAt`]: new Date() } });
  const other = role === "user" ? idOf(s.receiverId) : idOf(s.callerId);
  console.log(`[CALL] ${role === "user" ? "User" : "Consultant"} disconnected`, { callId: cid });
  console.log("[CALL] Grace timer started", { callId: cid, role, graceMs: GRACE_MS });
  emitTo(other, "participantDisconnected", { kind: "call", chatId: cid, callId: cid, role, graceMs: GRACE_MS, at: new Date().toISOString() });
  scheduleGrace(cid, role, GRACE_MS);
  return { cid, role };
}

function scheduleGrace(cid, role, ms) {
  cancelGrace(cid);
  graceTimers.set(String(cid), { role, timer: setTimeout(() => onGraceExpired(cid, role), ms) });
}
function cancelGrace(cid) {
  const g = graceTimers.get(String(cid));
  if (g) { clearTimeout(g.timer); graceTimers.delete(String(cid)); }
}
async function onGraceExpired(cid, role) {
  graceTimers.delete(String(cid));
  const s = await CallSession.findById(cid);
  if (!s || !BILLABLE_LOCK.includes(s.status)) return;
  if (s[`${role}Connected`] !== false) return;
  console.log("[CALL] Grace expired", { callId: String(cid), role });
  await endAndBroadcast({ callId: cid, endedBy: "system", endReason: `${role}_disconnected_timeout` });
}

async function markConnected(userId) {
  const s = await getActiveCallForUser(userId);
  if (!s) return null;
  const role = roleFor(s, userId);
  if (!role) return null;
  const cid = String(s._id);
  const wasDisconnected = s[`${role}Connected`] === false;
  await CallSession.updateOne({ _id: cid }, { $set: { [`${role}Connected`]: true }, $unset: { [`${role}DisconnectedAt`]: 1 } });
  if (wasDisconnected && BILLABLE_LOCK.includes(s.status)) {
    cancelGrace(cid);
    const other = role === "user" ? idOf(s.receiverId) : idOf(s.callerId);
    console.log(`[CALL] ${role === "user" ? "User" : "Consultant"} reconnected`, { callId: cid });
    emitTo(other, "participantReconnected", { kind: "call", chatId: cid, callId: cid, role, at: new Date().toISOString() });
  }
  const fresh = await CallSession.findById(cid);
  const parties = await withParties(fresh);
  return snapshot(fresh, {
    role,
    counterpart: role === "user" ? parties.receiver : parties.caller,
    ratePerMinute: parties.ratePerMinute,
  });
}

/* ── 6. credit watchdog ────────────────────────────────────── */

async function armWatchdog(callId) {
  cancelWatchdog(callId);
  const s = await CallSession.findById(callId);
  if (!s || s.status !== "active" || !s.connectedAt) return;
  const [user, consultant] = await Promise.all([
    User.findById(s.callerId).select("walletBalance"),
    User.findById(s.receiverId).select("voicePerMinute videoPerMinute"),
  ]);
  const perSecond = ratePerMinute(consultant, s.callType) / 60;
  if (!(perSecond > 0)) return;
  const maxSeconds = Math.floor(Math.max(0, Number(user?.walletBalance) || 0) / perSecond);
  const elapsed = Math.floor((Date.now() - new Date(s.connectedAt)) / 1000);
  const remaining = Math.max(0, maxSeconds - elapsed);
  console.log("[CALL] Credit watchdog armed", { callId: String(callId), maxSeconds, elapsed, remaining });
  const timers = [];
  for (const warn of WARN_AT_SEC) {
    const at = (remaining - warn) * 1000;
    if (at > 0) {
      timers.push(setTimeout(() => {
        const p = { callId: String(callId), secondsRemaining: warn };
        emitTo(s.callerId, "creditsWarning", p);
        emitTo(s.receiverId, "creditsWarning", p);
      }, at));
    }
  }
  timers.push(setTimeout(async () => {
    watchdogs.delete(String(callId));
    const p = { callId: String(callId), transactionId: s.transtionId, reason: "insufficient-balance" };
    emitTo(s.callerId, "creditsExhausted", p);
    emitTo(s.receiverId, "creditsExhausted", p);
    emitTo(s.callerId, "autoCallEnded-no-balance", p); // legacy
    emitTo(s.receiverId, "autoCallEnded-no-balance", p);
    await endAndBroadcast({ callId, endedBy: "system", endReason: "credits_exhausted" });
  }, remaining * 1000));
  watchdogs.set(String(callId), timers);
}
function cancelWatchdog(callId) {
  const t = watchdogs.get(String(callId));
  if (t) { t.forEach(clearTimeout); watchdogs.delete(String(callId)); }
}

/* ── 7. token ──────────────────────────────────────────────── */

async function issueToken({ callId, userId }) {
  const s = await CallSession.findById(callId);
  if (!s) return { ok: false, code: "not_found" };
  if (!roleFor(s, userId)) return { ok: false, code: "not_a_participant" };
  if (!["accepted", "connecting", "active"].includes(s.status)) return { ok: false, code: `call_${s.status}` };
  const appId = process.env.AGORA_APP_ID;
  const cert = process.env.AGORA_APP_CERTIFICATE;
  if (!appId || !cert) return { ok: false, code: "agora_not_configured" };
  const uid = agoraUidFor(userId, s.sessionId);
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const token = RtcTokenBuilder.buildTokenWithUid(appId, cert, s.sessionId, uid, RtcRole.PUBLISHER, expiresAt);
  return { ok: true, token, appId, channelName: s.sessionId, uid, expiresAt: expiresAt * 1000 };
}

/* ── 8. failure + recovery ─────────────────────────────────── */

async function failCall({ callId, by, reason = "media_failure" }) {
  const s = await CallSession.findById(callId);
  if (!s || !roleFor(s, by)) return { ok: false };
  if (s.status === "active") return endAndBroadcast({ callId, endedBy: by, endReason: reason });
  const r = await CallSession.findOneAndUpdate(
    { _id: callId, status: { $in: ["ringing", "accepted", "connecting"] } },
    { $set: { status: "failed", endReason: reason, endedBy: String(by), endTime: new Date() } },
    { new: true },
  );
  if (!r) return { ok: false };
  cancelRing(callId); cancelGrace(callId);
  console.log("[CALL] Failed before active — no charge", { callId: String(callId), reason });
  const p = { callId: String(callId), reason };
  emitTo(r.callerId, "callFailed", p);
  emitTo(r.receiverId, "callFailed", p);
  return { ok: true, session: snapshot(r) };
}

async function recoverCallSessions() {
  const live = await CallSession.find({ status: { $in: LIVE } });
  if (!live.length) return;
  console.log("[CALL] Recovering sessions after startup", { count: live.length });
  const now = Date.now();
  for (const s of live) {
    const cid = String(s._id);
    if (s.status === "ringing") {
      const since = now - new Date(s.ringingAt || s.createdAt).getTime();
      if (since >= RING_TIMEOUT_MS) await onRingTimeout(cid);
      else scheduleRingTimeout(cid, RING_TIMEOUT_MS - since);
      continue;
    }
    if (s.status === "ending") {
      await CallSession.updateOne({ _id: cid, status: "ending" }, { $set: { status: "active" } });
      await endAndBroadcast({ callId: cid, endedBy: s.endedBy || "system", endReason: s.endReason || "ended" });
      continue;
    }
    let ended = false;
    for (const role of ["user", "consultant"]) {
      const at = s[`${role}DisconnectedAt`];
      const since = at ? now - new Date(at).getTime() : 0;
      if (at && since >= GRACE_MS) {
        await endAndBroadcast({ callId: cid, endedBy: "system", endReason: `${role}_disconnected_timeout` });
        ended = true;
        break;
      }
      if (!at) await CallSession.updateOne({ _id: cid }, { $set: { [`${role}Connected`]: false, [`${role}DisconnectedAt`]: new Date() } });
      scheduleGrace(cid, role, at ? Math.max(0, GRACE_MS - since) : GRACE_MS);
    }
    if (!ended && s.status === "active") await armWatchdog(cid);
  }
}

module.exports = {
  GRACE_MS,
  RING_TIMEOUT_MS,
  setIo,
  emitTo,
  snapshot,
  withParties,
  getActiveCallForUser,
  requestCall,
  cancelCall,
  rejectCall,
  acceptCall,
  markJoined,
  endCallSession,
  endAndBroadcast,
  broadcastEnded,
  markDisconnected,
  markConnected,
  issueToken,
  failCall,
  recoverCallSessions,
};
