const express = require("express");
const callRoutes = express.Router();
const { generateToken, generateVoiceToken, getCaller_Receiver_Details } = require("../Controller/videoCallController");
const { authenticateToken } = require("../Auth/signup-signin");
const { requireCallParty } = require("../MiddleWare/requireCallParty");

callRoutes.post("/generate-token", requireCallParty, generateToken);
callRoutes.post("/generate-voice-token", requireCallParty, generateVoiceToken);
callRoutes.get("/get-caller-receiver-details/:callerId/:receiverId", getCaller_Receiver_Details);

module.exports = { callRoutes };