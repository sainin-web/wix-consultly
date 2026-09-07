const mongoose = require("mongoose");
const { MessageModal } = require("../Modal/messageSchema");
const { ChatList } = require("../Modal/chatListSchema");
const {
  getActiveChatForUser,
  endAndBroadcast,
  sessionSnapshot,
} = require("../services/chatSession");

const getChatHistory = async (request, response) => {
  try {
    const { shopId, consultantId, userId } = request.params;
    if (
      !mongoose.Types.ObjectId.isValid(shopId) ||
      !mongoose.Types.ObjectId.isValid(consultantId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return response.status(400).json({ message: "Invalid IDs" });
    }

    const chatHistory = await MessageModal.find({
      shop_id: shopId,
      $or: [
        { senderId: userId, receiverId: consultantId }, // user → consultant
        { senderId: consultantId, receiverId: userId }, // consultant → user
      ],
    }).sort({ timestamp: 1, _id: 1 }); // stable order

    return response.status(200).json({
      success: true,
      message: "Chat history fetched successfully",
      chatHistory: chatHistory || [],
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};

const getUserInRecentChat = async (request, response) => {
  try {
    const { shopId, userId, consultantId } = request.params;
    if (
      !mongoose.Types.ObjectId.isValid(shopId) ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(consultantId)
    ) {
      return response.status(400).json({ message: "Invalid IDs" });
    }
    const userInRecentChat = await ChatList.findOne({
      shop_id: shopId,
      senderId: userId,
      receiverId: consultantId,
    });
    if (!userInRecentChat) {
      return response.status(400).json({ message: "User not found in recent chat" });
    }
    userInRecentChat.isRequest = true;
    await userInRecentChat.save();
    return response.status(200).json({ success: true, message: "User found in recent chat" });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/chat/active-session/:userId
 * The one active chat session this user (customer or consultant) is part of.
 * Clients call this on load so the DB — not localStorage — decides state.
 */
const getActiveSession = async (request, response) => {
  try {
    const { userId } = request.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.status(400).json({ success: false, message: "Invalid user ID" });
    }
    const tx = await getActiveChatForUser(userId);
    if (!tx) return response.status(200).json({ success: true, active: false, session: null });

    const role = String(tx.senderId?._id) === String(userId) ? "user" : "consultant";
    const other = role === "user" ? tx.receiverId : tx.senderId;
    return response.status(200).json({
      success: true,
      active: true,
      session: sessionSnapshot(tx, {
        role,
        counterpart: other
          ? { id: String(other._id), fullname: other.fullname, profileImage: other.profileImage }
          : null,
      }),
    });
  } catch (error) {
    console.error("[CHAT ERROR] getActiveSession:", error.message);
    return response.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/chat/end-session/:transactionId   body: { endedBy }
 * Idempotent. Same finalization path as the socket handler; safe to retry.
 */
const endSession = async (request, response) => {
  try {
    const { transactionId } = request.params;
    const { endedBy } = request.body || {};
    if (!mongoose.Types.ObjectId.isValid(transactionId) || !mongoose.Types.ObjectId.isValid(endedBy || "")) {
      return response.status(400).json({ success: false, message: "Invalid IDs" });
    }
    const tx = await require("../Modal/transactionHistroy").TransactionHistroy.findById(transactionId).select("senderId receiverId");
    if (!tx) return response.status(404).json({ success: false, message: "Session not found" });
    if (![String(tx.senderId), String(tx.receiverId)].includes(String(endedBy))) {
      return response.status(403).json({ success: false, message: "Not a participant of this session" });
    }
    const result = await endAndBroadcast({ transactionId, endedBy, endReason: "ended" });
    if (!result.ok) return response.status(409).json({ success: false, message: result.error });
    return response.status(200).json({ success: true, alreadyEnded: Boolean(result.alreadyEnded), session: result.session });
  } catch (error) {
    console.error("[CHAT ERROR] endSession:", error.message);
    return response.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getChatHistory, getUserInRecentChat, getActiveSession, endSession };
