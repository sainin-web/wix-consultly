const express = require("express");
const { getChatHistory, getUserInRecentChat } = require("../Controller/chatController");
const { authenticateToken } = require("../Auth/signup-signin");
const chatRoutes = express.Router();

chatRoutes.get("/get/chat-history/:shopId/:userId/:consultantId", getChatHistory);
chatRoutes.put("/update-user-request/:shopId/:userId/:consultantId",  getUserInRecentChat);

module.exports = chatRoutes;    