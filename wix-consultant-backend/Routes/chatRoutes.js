const express = require("express");
const {
  getChatHistory,
  getUserInRecentChat,
  getActiveSession,
  endSession,
} = require("../Controller/chatController");
const chatRoutes = express.Router();

chatRoutes.get("/get/chat-history/:shopId/:userId/:consultantId", getChatHistory);
chatRoutes.put("/update-user-request/:shopId/:userId/:consultantId", getUserInRecentChat);

// Server-authoritative session state (used on load / refresh by both clients)
chatRoutes.get("/active-session/:userId", getActiveSession);
// Idempotent end (same finalization path as the socket "endChat" event)
// text/plain so navigator.sendBeacon() can call it on page unload without a CORS preflight
chatRoutes.post("/end-session/:transactionId", express.text({ type: ["text/plain", "text/*"] }), endSession);

module.exports = chatRoutes;
