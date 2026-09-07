const { Server } = require("socket.io");
const { User } = require("./Modal/userSchema");
const { default: mongoose } = require("mongoose");
const { ChatList } = require("./Modal/chatListSchema");
const { MessageModal } = require("./Modal/messageSchema");
const sendFCM = require("./firebase/sendNotification");
const { TransactionHistroy } = require("./Modal/transactionHistroy");
const { missCalled } = require("./Modal/miscallasHistroy");
const { WalletHistory } = require("./Modal/walletHistory");
const { CallSession } = require("./Modal/callSessions");
const { formatTime } = require("./Helper/helper");
const { sendCallFCM } = require("./firebase/callPushNotification");
const { ConsultantClient } = require("./Modal/consultantClient");
const { socketCors } = require("./config/corsConfig");
const {
  assertPartyToEvent,
  requireRegisteredSocket,
  registerSocketUser,
} = require("./MiddleWare/socketAuth");
const {
  broadcastOnlineUsers,
  emitToUser,
  queuePending,
  replayPending,
  removeSocketFromRegistry,
} = require("./MiddleWare/socketRegistry");
const { shopModel } = require("./Modal/shopify");
const chatSession = require("./services/chatSession");
const callSession = require("./services/callSession");

const ioServer = (server) => {
  const io = new Server(server, {
    cors: socketCors,
  });

  const onlineUsers = new Map();
  let activeCalls = new Map();
  const pendingIncomingByUser = new Map();
  chatSession.setIo(io, onlineUsers);
  callSession.setIo(io, onlineUsers);
  callSession.recoverCallSessions().catch((e) => console.error("[CALL ERROR] recovery:", e.message));
  chatSession.recoverChatSessions().catch((e) => console.error("[CHAT ERROR] recovery:", e.message));
  io.on("connection", (socket) => {
    console.log("[socket] connected:", socket.id);

    socket.on("register", async (user_Id) => {
      const raw =
        typeof user_Id === "object" && user_Id !== null
          ? user_Id.userId || user_Id._id || user_Id.id
          : user_Id;
      const uid = raw ? String(raw).trim() : "";

      const ok = await registerSocketUser(socket, uid, onlineUsers);
      socket.emit("registerAck", {
        success: Boolean(ok),
        userId: ok ? uid : null,
      });

      if (ok) {
        broadcastOnlineUsers(io, onlineUsers);
        try {
          const active = await chatSession.markConnected(uid);
          if (active) socket.emit("chatResumed", active);
        } catch (e) {
          console.error("[CHAT ERROR] markConnected:", e.message);
        }
        // Call presence is per CALL TAB (call-attach), not per registered socket:
        // the Wix page keeps its own socket open while the call runs in its tab.
        const replayed = await replayPending(
          io,
          onlineUsers,
          pendingIncomingByUser,
          uid,
          "incoming-call",
        );
        if (replayed > 0) {
          console.log(
            "[socket] replayed",
            replayed,
            "pending incoming-call(s) →",
            uid,
          );
        }
        console.log("[socket] ONLINE:", [...onlineUsers.entries()]);
      } else {
        console.warn("[socket] register failed for", uid);
      }
    });

    // ── Calls: every handler delegates to services/callSession.js ─────────────
    // The socket must be registered as the acting user; nothing here re-registers
    // a socket on another user's behalf (that was the chat "End" bug).
    const actingUser = () => (socket.data.userId ? String(socket.data.userId) : "");

    socket.on("call-user", async ({ callerId, receiverId, callType, shop } = {}) => {
      const cid = callerId ? String(callerId) : "";
      if (!socket.data.userId || String(socket.data.userId) !== cid) {
        const autoReg = await registerSocketUser(socket, cid, onlineUsers);
        if (!autoReg) return socket.emit("callFailed", { reason: "not_registered" });
        broadcastOnlineUsers(io, onlineUsers);
      }
      const r = await callSession.requestCall({ callerId: cid, receiverId, callType, shopId: shop });
      if (!r.ok) {
        console.warn("[CALL] request rejected", { code: r.code, callerId: cid });
        if (r.code === "insufficient_balance") {
          io.to(cid).emit("balanceError", { message: "Insufficient wallet balance", required: r.required, available: r.available });
        }
        socket.emit("callRequestFailed", { code: r.code, message: r.message, callId: r.callId || null });
        return;
      }
      socket.emit("callRequested", r.session);
    });

    // The dedicated call tab binds its socket to the call. From now on THIS
    // socket is the participant's presence for grace/resume purposes.
    socket.on("call-attach", async ({ callId } = {}) => {
      const by = actingUser();
      if (!by || !callId) return socket.emit("callAttached", { ok: false, reason: "not_registered" });
      socket.data.callId = String(callId);
      try {
        const snap = await callSession.markConnected(by, callId);
        console.log("[CALL SESSION] socket attached", { socket: socket.id, userId: by, callId: String(callId), status: snap?.status || "none" });
        socket.emit("callAttached", { ok: Boolean(snap), callId: String(callId), status: snap?.status || null });
        if (snap) socket.emit("callResumed", snap);
      } catch (e) {
        console.error("[CALL ERROR] attach:", e.message);
        socket.emit("callAttached", { ok: false, callId: String(callId), reason: "error" });
      }
    });

    socket.on("cancel-call", async ({ callId } = {}) => {
      const by = actingUser();
      if (!by || !callId) return;
      await callSession.cancelCall({ callId, by });
    });

    socket.on("reject-call", async ({ callId } = {}) => {
      const by = actingUser();
      if (!by || !callId) return;
      await callSession.rejectCall({ callId, by });
    });

    socket.on("call-accepted", async ({ callId } = {}) => {
      const by = actingUser();
      if (!by || !callId) return;
      const r = await callSession.acceptCall({ callId, by });
      if (!r.ok) socket.emit("callFailed", { callId, reason: r.code });
    });

    // Agora joined on this side; when both sides have joined the server activates + bills.
    socket.on("call-joined", async ({ callId } = {}) => {
      const by = actingUser();
      if (!by || !callId) return;
      const r = await callSession.markJoined({ callId, userId: by });
      if (!r.ok) socket.emit("callFailed", { callId, reason: r.code });
    });

    socket.on("call-failed", async ({ callId, reason } = {}) => {
      const by = actingUser();
      if (!by || !callId) return;
      await callSession.failCall({ callId, by, reason: reason || "media_failure" });
    });

    socket.on("call-ended", async ({ callId } = {}) => {
      const by = actingUser();
      if (!by) {
        console.warn("[CALL ERROR] call-ended rejected: socket not registered");
        return;
      }
      if (!callId) return;
      const r = await callSession.endAndBroadcast({ callId, endedBy: by, endReason: "ended" });
      if (!r.ok) socket.emit("callEndFailed", { callId, reason: r.error });
      else if (r.alreadyEnded) callSession.broadcastEnded(r.session);
    });

    socket.on("sendMessage", async (data) => {
      const { senderId, receiverId, shop_id, text, timestamp } = data;
      console.log("[CHAT DEBUG] sendMessage received", {
        from: String(senderId || ""),
        to: String(receiverId || ""),
        shop: String(shop_id || ""),
        boundSocketUser: socket.data.userId || null,
      });

      const sid = senderId ? String(senderId) : "";
      if (
        !socket.data.userId ||
        String(socket.data.userId) !== sid
      ) {
        const autoReg = await registerSocketUser(socket, sid, onlineUsers);
        if (!autoReg) {
          console.warn("sendMessage rejected:", {
            boundUserId: socket.data.userId,
            senderId: sid,
            receiverId,
            reason: "register failed",
          });
          return;
        }
        broadcastOnlineUsers(io, onlineUsers);
      }

      if (
        !requireRegisteredSocket(socket) ||
        !assertPartyToEvent(socket, { senderId: sid, receiverId }, [
          "senderId",
          "receiverId",
        ])
      ) {
        console.warn("sendMessage rejected:", {
          boundUserId: socket.data.userId,
          senderId: sid,
          receiverId,
        });
        return;
      }
      if (!senderId || !receiverId || !shop_id) {
        console.log(" Missing required IDs");
        return;
      }
      try {
        const sender = await User.findById(senderId);
        if (!sender) throw new Error("Sender not found");

        /**
         * if sender is customer then deduct the amount from sender's
         *  wallet and add the amount to receiver's wallet and add the admin commission to the shop's wallet
         *  and create a transaction record in the database
         */

        if (sender.userType === "customer") {
          const receiver = await User.findById(receiverId);
          if (!receiver) throw new Error("Receiver not found");
          const chatCost = Number(receiver.chatCost);

          if (Number(sender.walletBalance) < chatCost) {
            io.to(senderId.toString()).emit("balanceError", {
              message: "Insufficient wallet balance",
              required: chatCost,
              available: sender.walletBalance,
            });
            return;
          }

          const activeTx = await TransactionHistroy.findOne({
            type: "chat",
            senderId,
            receiverId,
            status: { $in: ["active", "ending"] },
          }).select("status");
          if (activeTx?.status === "ending") {
            console.warn("[CHAT] message rejected: session is finalizing", { userId: String(senderId) });
            socket.emit("messageRejected", { reason: "session_ending", message: "This chat session has ended." });
            return;
          }
          if (!activeTx && ["request", "unlock"].includes(sender.isChatAccepted)) {
            console.warn("[CHAT] message rejected: chat pending acceptance", { userId: String(senderId) });
            socket.emit("messageRejected", { reason: "chat_pending", message: "Wait for the consultant to accept the chat." });
            return;
          }
          if (
            sender.isChatAccepted !== "accepted" &&
            sender.isChatAccepted !== "request"
          ) {
            await User.updateOne(
              { _id: senderId },
              { $set: { isChatAccepted: "request" } }
            );
          }
        }

        if (sender.userType === "consultant") {
          const endingTx = await TransactionHistroy.findOne({
            type: "chat", senderId: receiverId, receiverId: senderId, status: "ending",
          }).select("_id");
          if (endingTx) {
            socket.emit("messageRejected", { reason: "session_ending", message: "This chat session has ended." });
            return;
          }
        }

        const existingChat = await ChatList.findOne({
          senderId,
          receiverId,
          shop_id,
        });

        if (!existingChat) {
          console.log("[CHAT DEBUG] Chat session created (ChatList, isRequest:false)", {
            userId: String(senderId),
            consultantId: String(receiverId),
            shop: String(shop_id),
          });
          await ChatList.create([
            {
              senderId,
              receiverId,
              shop_id,
              lastMessage: text,
              lastMessageTime: timestamp,
              isRequest: false,
            },
          ]);
        } else {
          await ChatList.updateOne(
            { _id: existingChat._id },
            { lastMessage: text, lastMessageTime: timestamp },
          );
        }

        const savedChat = await MessageModal.create({
          senderId,
          receiverId,
          shop_id,
          text,
          timestamp,
          isRead: false,
        });

        const senderInfo = await User.findById(senderId)
          .select("fullname profileImage")
          .lean();

        const customerUser = await User.findOne({
          _id: { $in: [senderId, receiverId] },
          userType: "customer",
        });
        const consultantUser = await User.findOne({
          _id: { $in: [senderId, receiverId] },
          userType: "consultant",
        });

        if (customerUser?.isChatAccepted === "chatEnd") {
          await User.updateOne(
            { _id: customerUser._id },
            { $set: { isChatAccepted: "request" } }
          );
        }

        if (customerUser && consultantUser) {
          const existingUser = await ConsultantClient.findOne({
            userId: customerUser._id,
            consultantId: consultantUser._id,
            shop_id,
          });
          if (!existingUser) {
            await ConsultantClient.create({
              userId: customerUser._id,
              consultantId: consultantUser._id,
              shop_id,
            });
          }
        }

        const messageWithSender = {
          ...savedChat.toObject(),
          senderName: senderInfo?.fullname || "User",
          avatar: senderInfo?.profileImage || null,
        };

        const deliveryInfo = await emitToUser(io, onlineUsers, receiverId, "receiveMessage", messageWithSender);
        console.log("[CHAT DEBUG] Socket event emitted: receiveMessage →", String(receiverId), {
          roomSockets: deliveryInfo.roomCount,
          delivered: deliveryInfo.delivered,
          consultantOnline: onlineUsers.has(String(receiverId)),
        });
        if (String(senderId) !== String(receiverId)) {
          emitToUser(io, onlineUsers, senderId, "receiveMessage", messageWithSender);
        }
        const receiver = await User.findById(receiverId);
        if (receiver?.firebaseToken?.token && !receiver?.isActive) {
       
          const shop_Domain = await shopModel.findById(shop_id);
          // await sendFCM(
          //   receiver.firebaseToken.token,
          //   senderInfo.fullname,
          //   text,
          //   "https://www.svgrepo.com/show/335455/profile-default.svg",
          //   shop_Domain.shop,
          // );
        }
      } catch (error) {
        console.error("❌ Transaction failed:", error);
      }
    });

    socket.on("acceptUserChat", async (acceptData) => {
      const { userId, shopId, consultantId } = acceptData;
      if (
        !requireRegisteredSocket(socket) ||
        !assertPartyToEvent(socket, { consultantId, userId }, [
          "consultantId",
          "userId",
        ])
      ) {
        console.warn("acceptUserChat rejected: socket not registered or user mismatch");
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(userId)) return;

      const user = await User.findById(userId);
      if (!user) return;
      if (!["request", "unlock"].includes(user.isChatAccepted)) {
        console.warn(
          "[socket] acceptUserChat skipped — state:",
          user.isChatAccepted
        );
        return;
      }

      user.isChatAccepted = "accepted";
      user.chatLock = false;
      await user.save();
      console.log("[CHAT DEBUG] Chat accepted by user → starting timed session", { userId: String(userId), consultantId: String(consultantId) });

      const transaction = await TransactionHistroy.create({
        senderId: userId,
        receiverId: consultantId,
        shop_id: shopId,
        startTime: new Date(),
        status: "active",
        type: "chat",
        userConnected: true,
        consultantConnected: true,
      });
      console.log("[CHAT] Session started", { chatId: String(transaction._id), userId: String(userId), consultantId: String(consultantId) });

      io.to(userId).emit("chatTimerStarted", {
        transactionId: transaction._id,
        startTime: transaction.startTime,
        userId,
        consultantId,
        shopId,
      });

      io.to(consultantId).emit("chatTimerStarted", {
        transactionId: transaction._id,
        startTime: transaction.startTime,
        userId,
        consultantId,
        shopId,
      });
      // Credit exhaustion is enforced by the server-side watchdog (restart-safe).
      await chatSession.armBalanceWatchdog(transaction._id);
    });

    socket.on("conFirmChatEmit", async (acceptDataIds) => {
      const { userId, shopId, consultantId } = acceptDataIds;
      console.log("[CHAT] Consultant accepted (conFirmChatEmit)", { userId: String(userId), consultantId: String(consultantId) });

      if (!userId || !shopId || !consultantId) return;

      const customerUser = await User.findById(userId);
      if (customerUser?.isChatAccepted === "chatEnd") {
        await User.updateOne(
          { _id: customerUser._id },
          { $set: { isChatAccepted: "unlock" } },
        );

        console.log("✅ isChatAccepted updated to request");
      }

      console.log("[CHAT DEBUG] Socket event emitted: acceptUser →", String(userId), { consultantId: String(consultantId) });
      io.to(userId).emit("acceptUser", {
        userId,
        shopId,
        consultantId,
        userAccepted: "accept",
      });

      console.log("✅ acceptUser emitted to user:", userId);
    });

    //----------------------------------------------- chat end --------------------------------------------------------------//

    socket.on("endChat", async (data) => {
      const { transactionId, userId, consultantId } = data || {};
      const bound = socket.data.userId ? String(socket.data.userId) : "";
      // The socket must already be registered as one of the two participants.
      // (The old handler re-registered the consultant's socket AS the user,
      // which kicked the user's real socket and swallowed the chatEnded event.)
      if (!bound || ![String(userId || ""), String(consultantId || "")].includes(bound)) {
        console.warn("[CHAT ERROR] endChat rejected: socket not a participant", { bound, userId, consultantId });
        socket.emit("chatEndFailed", { transactionId, reason: "not_a_participant" });
        return;
      }
      console.log("[CHAT] endChat requested", { chatId: String(transactionId), by: bound });
      const result = await chatSession.endAndBroadcast({
        transactionId,
        endedBy: bound,
        endReason: "ended",
      });
      if (!result.ok) {
        console.warn("[CHAT ERROR] endChat failed", { chatId: String(transactionId), error: result.error });
        socket.emit("chatEndFailed", { transactionId, reason: result.error });
      } else if (result.alreadyEnded) {
        // Idempotent: re-sync just this caller with the finalized result.
        chatSession.broadcastEnded(result.session);
      }
    });

    socket.on("disconnect", async (reason) => {
      const uid = removeSocketFromRegistry(socket, onlineUsers);
      console.log("[socket] disconnected:", socket.id, reason, uid || "");

      if (uid) {
        try {
          await User.findByIdAndUpdate(uid, { isActive: false });
        } catch (err) {
          console.error("[socket] isActive update error:", err.message);
        }
        try {
          // Chat: only if this was the user's LAST socket (a reconnect replaces the map entry first).
          if (!onlineUsers.has(uid)) await chatSession.markDisconnected(uid);
        } catch (err) {
          console.error("[CHAT ERROR] markDisconnected:", err.message);
        }
        try {
          // Call: the participant is "gone" when no socket attached to the call
          // remains — whether this was the call tab or the user's last socket.
          let callSocketAlive = false;
          try { callSocketAlive = (await io.in(uid).fetchSockets()).some((s) => s.data?.callId); } catch (e) { /* assume none */ }
          if (!callSocketAlive && (socket.data.callId || !onlineUsers.has(uid))) {
            console.log("[CALL DISCONNECT] presence lost", { userId: uid, wasCallTab: Boolean(socket.data.callId), reason });
            await callSession.markDisconnected(uid);
          }
        } catch (err) {
          console.error("[CALL ERROR] markDisconnected:", err.message);
        }
        broadcastOnlineUsers(io, onlineUsers);
        console.log("[socket] remaining online:", [...onlineUsers.keys()]);
      }
    });
  });
};

module.exports = { ioServer };
