const express = require("express");
const callRoutes = express.Router();
const {
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
} = require("../Controller/videoCallController");
const { requireCallParty } = require("../MiddleWare/requireCallParty");

// Legacy (kept)
callRoutes.post("/generate-token", requireCallParty, generateToken);
callRoutes.get("/get-caller-receiver-details/:callerId/:receiverId", getCaller_Receiver_Details);

// Authoritative lifecycle — every route delegates to services/callSession.js
callRoutes.post("/request", requestCall);
callRoutes.post("/accept/:callId", acceptCall);
callRoutes.post("/reject/:callId", rejectCall);
callRoutes.post("/cancel/:callId", cancelCall);
callRoutes.post("/joined/:callId", joinedCall);
callRoutes.post("/failed/:callId", failCall);
// text/plain so navigator.sendBeacon() can reach it on unload
callRoutes.post("/end-session/:callId", express.text({ type: ["text/plain", "text/*"] }), endCall);
callRoutes.post("/token/:callId", callToken);
callRoutes.get("/active-session/:userId", activeSession);

module.exports = { callRoutes };
