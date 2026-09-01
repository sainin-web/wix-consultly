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

const ioServer = (server) => {
  const io = new Server(server, {
    cors: socketCors,
  });

  const onlineUsers = new Map();
  let activeCalls = new Map();
  const pendingIncomingByUser = new Map();
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

    // ------------- call user --------------//

    socket.on("call-user", async ({ callerId, receiverId, channelName, callType, shop }) => {
      console.log("[socket] call-user________________________RR", callerId, receiverId, channelName, callType, shop);
        try {
          const cid = callerId ? String(callerId) : "";
          const rid = receiverId ? String(receiverId) : "";

          if (
            !socket.data.userId ||
            String(socket.data.userId) !== cid
          ) {
            const autoReg = await registerSocketUser(socket, cid, onlineUsers);
            if (!autoReg) {
              console.warn("call-user rejected: register failed", cid);
              return;
            }
            broadcastOnlineUsers(io, onlineUsers);
          }

          if (
            !requireRegisteredSocket(socket) ||
            !assertPartyToEvent(socket, { callerId: cid, receiverId: rid })
          ) {
            console.warn("call-user rejected: socket not registered or user mismatch");
            return;
          }
          if (!callerId || !receiverId || !channelName || !callType) {
            console.log("❌ Missing required fields");
            return;
          }
          console.log(
            "caller is calling to receiver",
            callerId,
            receiverId,
          );
          const callerInfo = await User.findById({ _id: callerId });
          if (!callerInfo) throw new Error("Caller not found");
          if (callerInfo.userType === "customer") {
            let isCallTypeCost =
              callType === "voice" ? "voiceCallCost" : "videoCallCost";

            const receiverInfo = await User.findById({ _id: receiverId })
              .select(isCallTypeCost)
              .lean();
            if (!receiverInfo) throw new Error("Receiver not found");
            const callCost = Number(receiverInfo[isCallTypeCost]);
            if (Number(callerInfo.walletBalance) < callCost) {
              io.to(callerId.toString()).emit("balanceError", {
                message: "Insufficient wallet balance",
                required: callCost,
                available: callerInfo.walletBalance,
              });
              return;
            }
          }

          const callId = `${cid}_${rid}_${channelName}`;
          const user_ = await User.findById(cid).select(
            "fullname walletBalance",
          );

          const incomingPayload = {
            callerId: cid,
            callerName: user_?.fullname || "Unknown",
            callType,
            channelName,
            shop,
            callId,
          };

          const { delivered, roomCount } = await emitToUser(
            io,
            onlineUsers,
            rid,
            "incoming-call",
            incomingPayload,
          );
          console.log(
            "[socket] incoming-call →",
            rid,
            "roomSockets:",
            roomCount,
            "delivered:",
            delivered,
          );
          if (roomCount === 0) {
            queuePending(pendingIncomingByUser, rid, incomingPayload);
            console.warn(
              "[socket] receiver not in room — queued for",
              rid,
              "onlineMap:",
              onlineUsers.has(rid),
            );
            await emitToUser(io, onlineUsers, cid, "call-receiver-offline", {
              receiverId: rid,
              channelName,
            });
          }

          const consultant = await User.findById(rid);
          let storeDoc = shop
            ? await shopModel.findOne({ shop }).lean()
            : null;
          if (!storeDoc && shop && mongoose.Types.ObjectId.isValid(shop)) {
            storeDoc = await shopModel.findById(shop).lean();
          }

          const fcmToken = consultant?.firebaseToken?.token;
          if (fcmToken && storeDoc?._id) {
            await sendCallFCM({
              token: fcmToken,
              callerId: cid,
              callerName: callerInfo.fullname,
              channelName,
              callType,
              receiverId: rid,
              shop,
              shopId: storeDoc._id.toString(),
              avatar: callerInfo.profileImage,
            });
          }

          const call = {
            callId,
            callerId: cid,
            receiverId: rid,
            channelName,
            callType,
            status: "ringing",
            startedAt: Date.now(),
            timeout: null,
          };

          activeCalls.set(callId, call);

          call.timeout = setTimeout(async () => {
            const activeCall = activeCalls.get(callId);
            if (!activeCall) {
              console.log("❌ Call not found");
              return;
            }

            if (activeCall.status === "ringing") {
              activeCall.status = "missed";
              emitToUser(io, onlineUsers, cid, "call-missed", { callId });
              emitToUser(io, onlineUsers, rid, "call-missed", { callId });

              await missCalled.create({
                senderId: cid,
                receiverId: rid,
                type: callType,
                reason: "timeout",
              });

              activeCalls.delete(callId);
              console.log("📞 Call auto-ended (missed):", callId);
            }
          }, 20000);
        } catch (error) {
          console.error("❌ Error in call-user:", error);
        }
      },
    );

    //---------------- reject call logics ----------------

    socket.on(
      "reject-call",
      async ({ callerId, receiverId, channelName, callType }) => {
        console.log(
          "📥 reject-call from receiver",
          callerId,
          receiverId,
          channelName,
          callType,
        );

        if (!callerId || !receiverId || !channelName || !callType) return;

        const callId = `${callerId}_${receiverId}_${channelName}`;
        const call = activeCalls.get(callId);
        if (!call) return;

        call.status = "rejected";
        clearTimeout(call.timeout);

        const payload = { callerId, receiverId, channelName, callType, callId };
        emitToUser(io, onlineUsers, callerId, "call-ended-rejected", payload);
        emitToUser(io, onlineUsers, receiverId, "call-ended-rejected", payload);
        console.log("activeCalls___Rejected", activeCalls);

        activeCalls.delete(callId);
        await missCalled.create({
          senderId: callerId,
          receiverId,
          type: callType,
          reason: "rejected",
        });

        console.log("📞 Call rejected & ended for both:", callId);
      },
    );

    //---------------- accept call logics ----------------

    socket.on(
      "call-accepted",
      async ({ callerId, receiverId, channelName, callType, shopId }) => {
        try {
          if (!callerId || !receiverId || !channelName || !callType) {
            console.log(" Missing required fields");
            return;
          }

          const callId = `${callerId}_${receiverId}_${channelName}`;
          const call = activeCalls.get(callId);

          if (!call) {
            console.log("❌ Call not found");
            return;
          }

          call.status = "accepted";
          clearTimeout(call.timeout);
          const transaction = await TransactionHistroy.create({
            senderId: callerId,
            receiverId: receiverId,
            shop_id: shopId,
            startTime: new Date(),
            status: "active",
            type: callType,
            duration: 0,
          });
          console.log("transaction_______________________Created", transaction);
          await transaction.save();
          const existingSession = await CallSession.findOne({
            sessionId: channelName,
            callerId: callerId,
            receiverId: receiverId,
          });

          if (existingSession) {
            await CallSession.findOneAndUpdate(
              {
                sessionId: channelName,
                callerId: callerId,
                receiverId: receiverId,
              },
              {
                $set: {
                  transtionId: transaction._id,
                  callType: callType,
                  shopId: shopId,
                  status: "ongoing",
                  startTime: new Date(),
                },
              },
              { new: true },
            );
          } else {
            await CallSession.create({
              sessionId: channelName,
              callerId: callerId,
              receiverId: receiverId,
              transtionId: transaction._id,
              callType: callType,
              shopId: shopId,
              status: "ongoing",
              startTime: new Date(),
            });
          }

          const acceptedPayload = {
            callerId,
            receiverId,
            channelName,
            callType,
            transactionId: transaction._id,
            shopId,
            startedAt: Date.now(),
          };
          emitToUser(
            io,
            onlineUsers,
            callerId,
            "call-accepted-started",
            acceptedPayload,
          );
          emitToUser(
            io,
            onlineUsers,
            receiverId,
            "call-accepted-started",
            acceptedPayload,
          );
          const user = await User.findById(callerId);
          if (!user) return console.log("Caller not found");

          const consultant = await User.findById(receiverId);
          if (!consultant) return console.log("Consultant not found");

          let userBalance = Number(user.walletBalance || 0);

          const callCostPerMinute =
            callType === "voice"
              ? Number(consultant.voicePerMinute)
              : Number(consultant.videoPerMinute);
          console.log("callCostPerMinute", callCostPerMinute);

          const perSecondCost = callCostPerMinute / 60;
          let maxCallSeconds = Math.floor(userBalance / perSecondCost);
          const minutes = Math.floor(maxCallSeconds / 60);
          const seconds = maxCallSeconds % 60;
          let callSecond = 0;
          console.log(
            `User can call for ${minutes} minutes and ${seconds} seconds`,
          );
          const interval = setInterval(async () => {
            if (userBalance >= perSecondCost) {
              userBalance -= perSecondCost;
              callSecond++;
            } else {
              clearInterval(interval);
              activeCalls.delete(callId);

              io.to(callerSocketId).emit("autoCallEnded-no-balance", {
                transactionId: transaction._id,
                reason: "insufficient-balance",
              });

              io.to(receiverSocketId).emit("autoCallEnded-no-balance", {
                transactionId: transaction._id,
                reason: "insufficient-balance",
              });

              console.log("🔥 Call auto-ended due to low balance");
            }
          }, 1000);
        } catch (error) {
          console.error("Error in call-accepted:", error);
        }
      },
    );

    socket.on(
      "user-is-on",
      async ({ callerId, receiverId, channelName, callType }) => {
        console.log(
          "callerId, receiverId, channelName, callType        =>",
          callerId,
          receiverId,
          channelName,
          callType,
        );
        const callerSocketId = onlineUsers.get(callerId);
        const receiverSocketId = onlineUsers.get(receiverId);

        console.log("callerSocketId =>", callerSocketId);
        console.log("receiverSocketId =>", receiverSocketId);

        if (callerSocketId) {
          io.to(callerSocketId).emit("both-user-join", {
            time: true,
            channelName,
            callType,
          });
        }

        if (receiverSocketId) {
          io.to(receiverSocketId).emit("both-user-join", {
            time: true,
            channelName,
            callType,
          });
        }
      },
    );

    socket.on(
      "user-connected-time-updated",
      async ({
        callerId,
        receiverId,
        channelName,
        callType,
        transactionId,
      }) => {
        // if (channelName) {
        //     const callSession = await CallSession.findOne({
        //         sessionId: channelName
        //     });

        //     // if (!callSession || !callSession.transtionId) {
        //     //     console.log("❌ CallSession or transactionId not found");
        //     //     return;
        //     // }

        // // const transaction = await TransactionHistroy.findById(
        //     callSession.transtionId
        // );

        //     if (!transaction) {
        //         console.log("❌ Transaction not found");
        //         return;
        //     }

        //     transaction.startTime = new Date();
        //     await transaction.save();

        //     console.log("✅ Transaction startTime updated");
        if (!transactionId) return;

        const cleanTransactionId = transactionId.replace(/"/g, "");

        if (!mongoose.Types.ObjectId.isValid(cleanTransactionId)) {
          console.log("❌ Invalid transactionId:", transactionId);
          return;
        }

        const updateTime =
          await TransactionHistroy.findById(cleanTransactionId);
        if (!updateTime) {
          console.log("❌ Transaction not found");
          return;
        }

        updateTime.startTime = new Date();
        await updateTime.save();

     
      },
    );

   

    socket.on("call-ended", async (data) => {
      const {
        transactionId,
        callerId,
        receiverId,
        shopId,
        callType,
        channelName,
        endby = "user_cut_call",
      } = data;
      if (!requireRegisteredSocket(socket) || !assertPartyToEvent(socket, { callerId, receiverId })) {
        console.warn("call-ended rejected: socket not registered or user mismatch");
        return;
      }
     
      let session;

      try {
        let trnaID;

        // Condition based on who ended the call
        if (endby === "user_cut_call" && transactionId) {
          // Directly use the provided transactionId without looking up CallSession
          console.log(
            "User cut call - using direct transactionId:",
            transactionId,
          );

          // Clean and validate transactionId
          let cleanTransactionId = transactionId;
          if (typeof cleanTransactionId === "string") {
            cleanTransactionId = cleanTransactionId.replace(/^"+|"+$/g, "");
          }

          if (!mongoose.Types.ObjectId.isValid(cleanTransactionId)) {
            console.log("Invalid transaction ID format:", transactionId);
            return;
          }

          trnaID = cleanTransactionId;
        } else if (endby === "consultant_cut_call") {
          // Find the call session first
          console.log(
            "Consultant cut call - finding session with channelName:",
            channelName,
          );

          const tsId = await CallSession.findOne({
            sessionId: channelName,
            callerId,
            receiverId,
          });

          if (!tsId) {
            console.log("Session not found for consultant cut call");
            throw new Error("session id not found");
          }

          trnaID = tsId.transtionId || transactionId;
          console.log("trnaID from session_____________________✅", trnaID);
        } else {
          console.log("Invalid endby value or missing parameters:", {
            endby,
            hasTransactionId: !!transactionId,
          });
          return;
        }

        // Check if transaction already completed before starting session
        console.log("Checking if transaction already completed:", trnaID);

        // Clean the ID for checking
        let checkId = trnaID;
        if (typeof checkId === "string") {
          checkId = checkId.replace(/^"+|"+$/g, "");
        }

        if (!mongoose.Types.ObjectId.isValid(checkId)) {
          console.log(
            "Invalid transaction ID format for completion check:",
            trnaID,
          );
          return;
        }

        // Check if transaction exists and is already completed
        const existingTransaction = await TransactionHistroy.findById(checkId);

        if (existingTransaction && existingTransaction.status === "completed") {
          console.log(
            `⚠️ Transaction ${trnaID} is already completed. Skipping call-end processing.`,
          );

          // Still notify clients that call ended but don't process again
          const alreadyDone = {
            trnaID,
            reason: "already_completed",
            endedBy: endby,
            message: "Call was already marked as completed",
          };
          emitToUser(io, onlineUsers, callerId, "callEnded", alreadyDone);
          emitToUser(io, onlineUsers, receiverId, "callEnded", alreadyDone);

          console.log(
            "✅ Skipped processing - transaction already completed:",
            trnaID,
          );
          return;
        }

        session = await mongoose.startSession();
        session.startTransaction();

        const transaction =
          await TransactionHistroy.findById(trnaID).session(session);
        if (!transaction) throw new Error("Transaction not found");

        if (transaction.status === "completed") {
     
          await session.abortTransaction();

          const alreadyDone = {
            trnaID,
            reason: "already_completed",
            endedBy: endby,
            message: "Call was already marked as completed",
          };
          emitToUser(io, onlineUsers, callerId, "callEnded", alreadyDone);
          emitToUser(io, onlineUsers, receiverId, "callEnded", alreadyDone);

          return;
        }

        const caller = await User.findById(callerId).session(session);
        if (!caller) throw new Error("Caller not found");

        const receiver = await User.findById(receiverId).session(session);
        if (!receiver) throw new Error("Receiver not found");
        // shopId = '699852a7c1284f43e86923f9'
        const shop = await shopModel.findById(shopId).session(session);
        if (!shop) throw new Error("Shop not found");

        const endTime = new Date();
        const totalSeconds = Math.floor(
          (endTime - new Date(transaction.startTime)) / 1000,
        );
        // const totalSeconds = totalSeconds_ - 0

        const callCostPerMinute =
          callType === "voice"
            ? Number(receiver.voicePerMinute)
            : Number(receiver.videoPerMinute);

        const perSecondCost = callCostPerMinute / 60;
        const totalAmount = Number((totalSeconds * perSecondCost).toFixed(2));
        const adminCommission =
          (totalAmount * Number(shop.adminPersenTage)) / 100;
        const receiverShare = totalAmount - adminCommission;
        const shopShare = adminCommission;

        // Update transaction
        transaction.endTime = endTime;
        transaction.duration = totalSeconds;
        transaction.totalAmount = totalAmount;
        transaction.status = "completed";
        transaction.type = callType;

        await transaction.save({ session });

        // Update wallets
        await User.findByIdAndUpdate(
          callerId,
          { $inc: { walletBalance: -totalAmount } },
          { session },
        );

        await User.findByIdAndUpdate(
          receiverId,
          { $inc: { walletBalance: receiverShare } },
          { session },
        );

        await shopModel.findByIdAndUpdate(
          shopId,
          { $inc: { adminWalletBalance: shopShare } },
          { session },
        );

        // Update transaction history with amounts
        const con = await TransactionHistroy.findByIdAndUpdate(
          trnaID,
          {
            $inc: {
              adminAmount: adminCommission,
              consultantAmount: receiverShare,
              amount: totalAmount,
            },
          },
          { session },
        );

        // Reset call acceptance status
        await User.findByIdAndUpdate(
          callerId,
          { $set: { isCallAccepted: false } },
          { session },
        );

        // Create wallet history records
        await WalletHistory.create(
          [
            {
              userId: callerId,
              shop_id: shopId,
              amount: totalAmount,
              referenceType: callType,
              transactionType: "usage",
              direction: "debit",
              description: `Call ended for ${formatTime(totalSeconds)} seconds`,
              status: "success",
            },
            {
              userId: receiverId,
              shop_id: shopId,
              amount: receiverShare,
              referenceType: callType,
              transactionType: "usage",
              direction: "credit",
              description: `Call ended for ${formatTime(totalSeconds)} seconds`,
              status: "success",
            },
          ],
          { session, ordered: true },
        );

        // Commit transaction
        await session.commitTransaction();

        const endedPayload = {
          trnaID,
          totalSeconds,
          totalAmount,
          reason: "ended",
          endedBy: endby,
          callerId,
          receiverId,
          channelName,
        };
        emitToUser(io, onlineUsers, callerId, "callEnded", endedPayload);
        emitToUser(io, onlineUsers, receiverId, "callEnded", endedPayload);

      } catch (error) {
        console.error("❌ Call transaction error:", error);
        if (session) {
          await session.abortTransaction();
        }
      } finally {
        if (session) {
          session.endSession();
        }
      }
    });

    socket.on("sendMessage", async (data) => {
      const { senderId, receiverId, shop_id, text, timestamp } = data;

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

        const existingChat = await ChatList.findOne({
          senderId,
          receiverId,
          shop_id,
        });

        if (!existingChat) {
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

        emitToUser(io, onlineUsers, receiverId, "receiveMessage", messageWithSender);
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

      const transaction = await TransactionHistroy.create({
        senderId: userId,
        receiverId: consultantId,
        shop_id: shopId,
        startTime: new Date(),
        status: "active",
        type: "chat",
      });

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
      let userBalance = Number(user?.walletBalance);
      const consultantCost = await User.findById(consultantId);
      const consultantChatCost = Number(consultantCost?.chatPerMinute);
      const perSecondCost = consultantChatCost / 60;
      if (userBalance < perSecondCost) {
        console.log("Insufficient balance to start chat");
        return;
      }

      const maxChatSeconds = Math.floor(userBalance / perSecondCost);
      const minutes = Math.floor(maxChatSeconds / 60);
      const seconds = maxChatSeconds % 60;

      console.log(
        `User can chat for ${minutes} minutes and ${seconds} seconds`,
      );
      let remainingBalance = userBalance;
      let chatSeconds = 0;

      const interval = setInterval(() => {
        if (remainingBalance >= perSecondCost) {
          remainingBalance -= perSecondCost;
          chatSeconds++;
        } else {
          clearInterval(interval);
          console.log("🔥 BACKEND: autoChatEnded EMIT", {
            transactionId: transaction._id,
            userId,
            consultantId,
          });

          io.to(userId).emit("autoChatEnded", {
            transactionId: transaction._id,
            reason: "auto-ended",
          });

          io.to(consultantId).emit("autoChatEnded", {
            transactionId: transaction._id,
            reason: "auto-ended",
          });
        }
      }, 1000);
    });

    socket.on("conFirmChatEmit", async (acceptDataIds) => {
      const { userId, shopId, consultantId } = acceptDataIds;
      console.log("conFirmChatEmit_______________________✅", acceptDataIds);

      if (!userId || !shopId || !consultantId) return;

      const customerUser = await User.findById(userId);
      if (customerUser?.isChatAccepted === "chatEnd") {
        await User.updateOne(
          { _id: customerUser._id },
          { $set: { isChatAccepted: "unlock" } },
        );

        console.log("✅ isChatAccepted updated to request");
      }

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
      const { transactionId, userId, consultantId, shopId } = data;
      const uid = userId ? String(userId) : "";
      const cid = consultantId ? String(consultantId) : "";

      if (
        !socket.data.userId ||
        (uid && String(socket.data.userId) !== uid)
      ) {
        if (uid) {
          const autoReg = await registerSocketUser(socket, uid, onlineUsers);
          if (!autoReg) {
            console.warn("endChat rejected:", {
              boundUserId: socket.data.userId,
              userId: uid,
              consultantId: cid,
              reason: "register failed",
            });
            return;
          }
        }
      }

      if (
        !requireRegisteredSocket(socket) ||
        !assertPartyToEvent(socket, { userId: uid, consultantId: cid }, [
          "userId",
          "consultantId",
        ])
      ) {
        console.warn("endChat rejected:", {
          boundUserId: socket.data.userId,
          userId: uid,
          consultantId: cid,
        });
        return;
      }
      console.log("endChat______✅", data);
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const transaction =
          await TransactionHistroy.findById(transactionId).session(session);
        if (!transaction) throw new Error("Transaction not found");
        if (transaction.status === "completed") {
          console.log(
            "Chat already completed — syncing timer stop to both clients",
            transactionId,
          );
          await session.abortTransaction();
          const syncPayload = {
            transactionId,
            totalSeconds: transaction.totalSeconds ?? 0,
            totalAmount: transaction.totalAmount ?? 0,
            reason: "already_completed",
          };
          await emitToUser(io, onlineUsers, uid, "chatEnded", syncPayload);
          await emitToUser(io, onlineUsers, cid, "chatEnded", syncPayload);
          return;
        }

        const consultantCost =
          await User.findById(consultantId).session(session);
        if (!consultantCost) throw new Error("Consultant not found");

        const shop = await shopModel.findById(shopId).session(session);
        console.log("shop_____________", shop);
        if (!shop) throw new Error("Shop not found");
        const user_ = await User.findById(userId).session(session);
        if (!user_) throw new Error("User not found");
        const endTime = new Date();
        const totalSeconds = Math.floor(
          (endTime - new Date(transaction.startTime)) / 1000,
        );
        const perSecondCost = consultantCost.chatPerMinute / 60;
        const totalAmount = Number((totalSeconds * perSecondCost).toFixed(2));
        const adminCommission =
          (totalAmount * Number(shop.adminPersenTage)) / 100;
        const consultantShare = totalAmount - adminCommission;
        const shopShare = adminCommission;
        transaction.endTime = endTime;
        transaction.totalSeconds = totalSeconds;
        transaction.totalAmount = totalAmount;
        transaction.status = "completed";
        await transaction.save({ session });
        await User.findByIdAndUpdate(
          userId,
          { $inc: { walletBalance: -totalAmount } },
          { session },
        );
        await User.findByIdAndUpdate(
          consultantId,
          { $inc: { walletBalance: consultantShare } },
          { session },
        );
        await shopModel.findByIdAndUpdate(
          shopId,
          { $inc: { adminWalletBalance: shopShare } },
          { session },
        );

        await TransactionHistroy.findByIdAndUpdate(
          transactionId,
          {
            $inc: {
              adminAmount: adminCommission,
              consultantAmount: consultantShare,
              amount: totalAmount,
            },
          },
          { session },
        );

        await User.findByIdAndUpdate(
          userId,
          { $set: { isChatAccepted: "chatEnd", chatLock: true } },
          { session },
        );
        await WalletHistory.create({
          userId: userId,
          shop_id: shopId,
          amount: totalAmount,
          transactionType: "usage",
          referenceType: "chat",
          direction: "debit",
          description: `Chat ended for ${formatTime(totalSeconds)} minutes`,
          status: "success",
        });
        await WalletHistory.create({
          userId: consultantId,
          shop_id: shopId,
          amount: consultantShare,
          transactionType: "usage",
          referenceType: "chat",
          direction: "credit",
          description: `Chat ended for ${formatTime(totalSeconds)} minutes`,
          status: "success",
        });

        await session.commitTransaction();

        const endedPayload = {
          transactionId,
          totalSeconds,
          totalAmount,
          reason: "ended",
        };
        await emitToUser(io, onlineUsers, uid, "chatEnded", endedPayload);
        await emitToUser(io, onlineUsers, cid, "chatEnded", endedPayload);

        console.log("✅ Chat ended:", transactionId);
      } catch (error) {
        console.log("Transaction error:", error);
        await session.abortTransaction();
      } finally {
        session.endSession();
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
        broadcastOnlineUsers(io, onlineUsers);
        console.log("[socket] remaining online:", [...onlineUsers.keys()]);
      }
    });
  });
};

module.exports = { ioServer };
