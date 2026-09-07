/**
 * Chat session lifecycle — the ONE authoritative implementation.
 *
 *   pending (ChatList.isRequest=false, no transaction)
 *     → accepted/active   Transaction{type:"chat", status:"active"}   (acceptUserChat)
 *     → ending            atomic lock taken by endChatSession()
 *     → completed         billed exactly once, billingFinalizedAt set
 *
 * Server timestamps are the billing authority (startTime / endTime on the
 * transaction). Frontend timers are display only.
 *
 * Idempotency: endChatSession() takes the "ending" lock with a conditional
 * findOneAndUpdate on status:"active". Only one caller can win that write;
 * everyone else receives the already-finalized (or in-progress) result and
 * nothing is billed twice — regardless of who calls (user, consultant,
 * disconnect timeout, balance watchdog, REST retry) or how many times.
 *
 * Disconnects: a 20s grace period (CHAT_GRACE_MS) per participant, tracked
 * in the DB (userConnected / userDisconnectedAt …) with an in-memory timer as
 * the fast path and recoverChatSessions() as the restart-safe slow path.
 */
const mongoose = require("mongoose");
const { TransactionHistroy } = require("../Modal/transactionHistroy");
const { User } = require("../Modal/userSchema");
const { shopModel } = require("../Modal/shopify");
const { WalletHistory } = require("../Modal/walletHistory");
const { formatTime } = require("../Helper/helper");

const GRACE_MS = Number(process.env.CHAT_GRACE_MS) || 20000;

let ioRef = null;
let onlineRef = null;
/** transactionId → { timer, role } */
const graceTimers = new Map();
/** transactionId → timer */
const balanceTimers = new Map();

function setIo(io, onlineUsers) {
  ioRef = io;
  onlineRef = onlineUsers;
}

/** Emit to a user's room (and mapped socket) — same delivery path as socketRegistry.emitToUser. */
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

function round2(n) {
  return Number((Math.round(Number(n) * 100) / 100).toFixed(2));
}

function sessionSnapshot(tx, extra = {}) {
  return {
    chatId: String(tx._id),
    transactionId: String(tx._id), // legacy field name kept for existing clients
    userId: idOf(tx.senderId),
    consultantId: idOf(tx.receiverId),
    shopId: idOf(tx.shop_id),
    status: tx.status,
    startedAt: tx.startTime,
    startTime: tx.startTime, // legacy
    endedAt: tx.endTime || null,
    endedBy: tx.endedBy || null,
    endReason: tx.endReason || null,
    durationSeconds: tx.totalSeconds ?? null,
    durationMinutes: tx.totalSeconds != null ? Math.ceil(tx.totalSeconds / 60) : null,
    finalAmount: tx.amount ?? null,
    userConnected: tx.userConnected !== false,
    consultantConnected: tx.consultantConnected !== false,
    ...extra,
  };
}

/** The single active chat a user (customer OR consultant) is part of, if any. */
async function getActiveChatForUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  return TransactionHistroy.findOne({
    type: "chat",
    status: { $in: ["active", "ending"] },
    $or: [{ senderId: userId }, { receiverId: userId }],
  })
    .sort({ startTime: -1 })
    .populate("senderId", "fullname profileImage")
    .populate("receiverId", "fullname profileImage");
}

/**
 * Finalize a chat session exactly once.
 * @returns {{ ok:boolean, alreadyEnded?:boolean, inProgress?:boolean, session?:object, error?:string }}
 */
async function endChatSession({ transactionId, endedBy = "system", endReason = "ended" }) {
  const tid = String(transactionId || "");
  if (!mongoose.Types.ObjectId.isValid(tid)) return { ok: false, error: "invalid transactionId" };

  // ── 1. Take the lock atomically: only ONE caller moves active → ending ──
  const locked = await TransactionHistroy.findOneAndUpdate(
    { _id: tid, type: "chat", status: "active" },
    { $set: { status: "ending", endedBy: String(endedBy), endReason } },
    { new: true },
  );

  if (!locked) {
    const existing = await TransactionHistroy.findById(tid);
    if (!existing) return { ok: false, error: "session not found" };
    if (existing.status === "completed") {
      console.log("[CHAT] endChatSession: already finalized, returning existing result", { chatId: tid });
      return { ok: true, alreadyEnded: true, session: sessionSnapshot(existing) };
    }
    if (existing.status === "ending") {
      console.log("[CHAT] endChatSession: finalization already in progress", { chatId: tid });
      return { ok: true, inProgress: true, session: sessionSnapshot(existing) };
    }
    return { ok: false, error: `session is ${existing.status}` };
  }

  cancelGrace(tid);
  cancelBalanceWatchdog(tid);

  const userId = String(locked.senderId);
  const consultantId = String(locked.receiverId);
  const shopId = String(locked.shop_id);
  console.log("[CHAT] Ending session", { chatId: tid, userId, consultantId, endedBy, endReason });

  // ── 2. Bill from server timestamps inside a transaction ──
  const session = await mongoose.startSession();
  try {
    let snapshot = null;
    await session.withTransaction(async () => {
      const tx = await TransactionHistroy.findById(tid).session(session);
      const consultant = await User.findById(consultantId).session(session);
      const user = await User.findById(userId).session(session);
      const shop = await shopModel.findById(shopId).session(session);
      if (!tx || !consultant || !user || !shop) throw new Error("session parties not found");

      const endTime = new Date();
      const totalSeconds = Math.max(0, Math.floor((endTime - new Date(tx.startTime)) / 1000));
      // Existing business rule preserved: per-second proration of chatPerMinute.
      const perSecondCost = Number(consultant.chatPerMinute || 0) / 60;
      const rawAmount = round2(totalSeconds * perSecondCost);
      // Never bill below zero balance (the watchdog should end the chat first;
      // this is the safety net for restarts / clock skew).
      const available = Math.max(0, Number(user.walletBalance) || 0);
      const totalAmount = Math.min(rawAmount, available);
      const adminCommission = round2((totalAmount * Number(shop.adminPersenTage || 0)) / 100);
      const consultantShare = round2(totalAmount - adminCommission);
      console.log("[BILLING] Calculating final amount", {
        chatId: tid, totalSeconds, perMinute: consultant.chatPerMinute, rawAmount, available, totalAmount,
      });

      tx.endTime = endTime;
      tx.totalSeconds = totalSeconds;
      tx.amount = totalAmount;
      tx.adminAmount = adminCommission;
      tx.consultantAmount = consultantShare;
      tx.status = "completed";
      tx.billingFinalizedAt = endTime;
      tx.userConnected = false;
      tx.consultantConnected = false;
      await tx.save({ session });

      if (totalAmount > 0) {
        await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -totalAmount } }, { session });
        await User.findByIdAndUpdate(consultantId, { $inc: { walletBalance: consultantShare } }, { session });
        await shopModel.findByIdAndUpdate(shopId, { $inc: { adminWalletBalance: adminCommission } }, { session });
      }
      await User.findByIdAndUpdate(userId, { $set: { isChatAccepted: "chatEnd", chatLock: true } }, { session });

      const description = `Chat ended for ${formatTime(totalSeconds)} minutes`;
      await WalletHistory.create(
        [
          { userId, shop_id: shopId, amount: totalAmount, transactionType: "usage", referenceType: "chat", referenceId: tx._id, direction: "debit", description, status: "success" },
          { userId: consultantId, shop_id: shopId, amount: consultantShare, transactionType: "usage", referenceType: "chat", referenceId: tx._id, direction: "credit", description, status: "success" },
        ],
        { session, ordered: true },
      );
      console.log("[BILLING] Wallet updated", { chatId: tid, user: -totalAmount, consultant: consultantShare, admin: adminCommission });
      snapshot = sessionSnapshot(tx, { consultantShare, adminCommission });
    });
    console.log("[CHAT] Session ended successfully", { chatId: tid, endReason });
    return { ok: true, session: snapshot };
  } catch (error) {
    // Release the lock so a retry can finalize; nothing was committed.
    await TransactionHistroy.updateOne({ _id: tid, status: "ending" }, { $set: { status: "active" } });
    console.error("[CHAT ERROR] endChatSession failed, lock released", { chatId: tid, error: error.message });
    return { ok: false, error: error.message };
  } finally {
    session.endSession();
  }
}

/** Build the legacy+new chatEnded payload and deliver it to both parties. */
function broadcastEnded(sessionInfo) {
  if (!sessionInfo) return;
  const payload = {
    ...sessionInfo,
    totalSeconds: sessionInfo.durationSeconds, // legacy
    totalAmount: sessionInfo.finalAmount, // legacy
    reason: sessionInfo.endReason, // legacy
  };
  emitTo(sessionInfo.userId, "chatEnded", payload);
  emitTo(sessionInfo.consultantId, "chatEnded", payload);
}

/** End + broadcast in one call (used by handlers, timers and the REST endpoint). */
async function endAndBroadcast(args) {
  const result = await endChatSession(args);
  if (result.ok && result.session && !result.inProgress) broadcastEnded(result.session);
  return result;
}

/* ── Disconnect grace ──────────────────────────────────────────── */

function roleFor(tx, userId) {
  if (idOf(tx.senderId) === String(userId)) return "user";
  if (idOf(tx.receiverId) === String(userId)) return "consultant";
  return null;
}

async function markDisconnected(userId) {
  const tx = await getActiveChatForUser(userId);
  if (!tx || tx.status !== "active") return null;
  const role = roleFor(tx, userId);
  if (!role) return null;
  const tid = String(tx._id);
  await TransactionHistroy.updateOne(
    { _id: tid, status: "active" },
    { $set: { [`${role}Connected`]: false, [`${role}DisconnectedAt`]: new Date() } },
  );
  const other = role === "user" ? idOf(tx.receiverId) : idOf(tx.senderId);
  console.log(`[CHAT] ${role === "user" ? "User" : "Consultant"} disconnected`, { chatId: tid, userId: String(userId) });
  console.log("[CHAT] Starting 20 second grace period", { chatId: tid, role, graceMs: GRACE_MS });
  emitTo(other, "participantDisconnected", { chatId: tid, role, graceMs: GRACE_MS, at: new Date().toISOString() });
  scheduleGrace(tid, role, GRACE_MS);
  return { tid, role };
}

function scheduleGrace(tid, role, ms) {
  cancelGrace(tid);
  const timer = setTimeout(() => onGraceExpired(tid, role), ms);
  graceTimers.set(tid, { timer, role });
}

function cancelGrace(tid) {
  const g = graceTimers.get(String(tid));
  if (g) {
    clearTimeout(g.timer);
    graceTimers.delete(String(tid));
  }
}

async function onGraceExpired(tid, role) {
  graceTimers.delete(tid);
  // Re-check the DB: the participant may have reconnected on another server.
  const tx = await TransactionHistroy.findById(tid);
  if (!tx || tx.status !== "active") return;
  if (tx[`${role}Connected`] !== false) {
    console.log("[CHAT] Grace period cancelled (participant reconnected)", { chatId: tid, role });
    return;
  }
  console.log("[CHAT] Disconnect timeout expired", { chatId: tid, role });
  await endAndBroadcast({ transactionId: tid, endedBy: "system", endReason: `${role}_disconnected_timeout` });
}

/** On (re)register: clear disconnect flags, cancel grace, tell both sides. Returns the active session snapshot. */
async function markConnected(userId) {
  const tx = await getActiveChatForUser(userId);
  if (!tx || tx.status !== "active") return null;
  const role = roleFor(tx, userId);
  if (!role) return null;
  const tid = String(tx._id);
  const wasDisconnected = tx[`${role}Connected`] === false;
  await TransactionHistroy.updateOne(
    { _id: tid },
    { $set: { [`${role}Connected`]: true }, $unset: { [`${role}DisconnectedAt`]: 1 } },
  );
  if (wasDisconnected) {
    cancelGrace(tid);
    const other = role === "user" ? idOf(tx.receiverId) : idOf(tx.senderId);
    console.log(`[CHAT] ${role === "user" ? "User" : "Consultant"} reconnected`, { chatId: tid, userId: String(userId) });
    console.log("[CHAT] Grace period cancelled", { chatId: tid, role });
    emitTo(other, "participantReconnected", { chatId: tid, role, at: new Date().toISOString() });
  } else {
    console.log(`[CHAT] ${role === "user" ? "User" : "Consultant"} connected`, { chatId: tid });
  }
  const fresh = await TransactionHistroy.findById(tid).populate("senderId", "fullname profileImage").populate("receiverId", "fullname profileImage");
  return sessionSnapshot(fresh, {
    counterpart:
      role === "user"
        ? { id: String(fresh.receiverId?._id), fullname: fresh.receiverId?.fullname, profileImage: fresh.receiverId?.profileImage }
        : { id: String(fresh.senderId?._id), fullname: fresh.senderId?.fullname, profileImage: fresh.senderId?.profileImage },
    role,
  });
}

/* ── Balance watchdog (credit exhaustion) ───────────────────────── */

async function armBalanceWatchdog(tid) {
  cancelBalanceWatchdog(tid);
  const tx = await TransactionHistroy.findById(tid);
  if (!tx || tx.status !== "active") return;
  const [user, consultant] = await Promise.all([
    User.findById(tx.senderId).select("walletBalance"),
    User.findById(tx.receiverId).select("chatPerMinute"),
  ]);
  const perSecond = Number(consultant?.chatPerMinute || 0) / 60;
  if (!(perSecond > 0)) return; // free chat: nothing to exhaust
  const maxSeconds = Math.floor(Math.max(0, Number(user?.walletBalance) || 0) / perSecond);
  const elapsed = Math.floor((Date.now() - new Date(tx.startTime)) / 1000);
  const remainingMs = Math.max(0, (maxSeconds - elapsed) * 1000);
  console.log("[CHAT] Balance watchdog armed", { chatId: String(tid), maxSeconds, elapsed, remainingMs });
  const timer = setTimeout(async () => {
    balanceTimers.delete(String(tid));
    const payload = { transactionId: String(tid), chatId: String(tid), reason: "insufficient-balance" };
    emitTo(tx.senderId, "autoChatEnded", payload); // legacy event kept for existing clients
    emitTo(tx.receiverId, "autoChatEnded", payload);
    await endAndBroadcast({ transactionId: tid, endedBy: "system", endReason: "insufficient_balance" });
  }, remainingMs);
  balanceTimers.set(String(tid), timer);
}

function cancelBalanceWatchdog(tid) {
  const t = balanceTimers.get(String(tid));
  if (t) {
    clearTimeout(t);
    balanceTimers.delete(String(tid));
  }
}

/* ── Restart safety ─────────────────────────────────────────────── */

async function recoverChatSessions() {
  const active = await TransactionHistroy.find({ type: "chat", status: { $in: ["active", "ending"] } });
  if (!active.length) return;
  console.log("[CHAT] Recovering sessions after startup", { count: active.length });
  const now = Date.now();
  for (const tx of active) {
    const tid = String(tx._id);
    if (tx.status === "ending") {
      // A finalization was interrupted mid-flight: nothing committed, so retry it.
      await TransactionHistroy.updateOne({ _id: tid, status: "ending" }, { $set: { status: "active" } });
      await endAndBroadcast({ transactionId: tid, endedBy: tx.endedBy || "system", endReason: tx.endReason || "ended" });
      continue;
    }
    // Nobody is connected right after a restart; treat both as disconnected now
    // unless a DB timestamp already says when they dropped.
    for (const role of ["user", "consultant"]) {
      const at = tx[`${role}DisconnectedAt`];
      const since = at ? now - new Date(at).getTime() : 0;
      if (at && since >= GRACE_MS) {
        console.log("[CHAT] Grace already expired during downtime", { chatId: tid, role });
        await endAndBroadcast({ transactionId: tid, endedBy: "system", endReason: `${role}_disconnected_timeout` });
        break;
      }
      if (!at) {
        await TransactionHistroy.updateOne({ _id: tid }, { $set: { [`${role}Connected`]: false, [`${role}DisconnectedAt`]: new Date() } });
      }
      scheduleGrace(tid, role, at ? Math.max(0, GRACE_MS - since) : GRACE_MS);
    }
    await armBalanceWatchdog(tid);
  }
}

module.exports = {
  GRACE_MS,
  setIo,
  emitTo,
  sessionSnapshot,
  getActiveChatForUser,
  endChatSession,
  endAndBroadcast,
  broadcastEnded,
  markDisconnected,
  markConnected,
  cancelGrace,
  armBalanceWatchdog,
  cancelBalanceWatchdog,
  recoverChatSessions,
};
