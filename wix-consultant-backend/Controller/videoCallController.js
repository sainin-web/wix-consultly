
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const { User } = require("../Modal/userSchema");
const { default: mongoose } = require("mongoose");


const generateToken = async (req, res) => {
   try {
      const { channelName, uid } = req.body;
      console.log("req.body", req.body)
      console.log("channelName", channelName)
      console.log("uid", uid)
      if (!channelName || uid === undefined) {
         return res.status(400).json({
            error: "channelName and uid are required"
         });
      }

      if (!process.env.AGORA_APP_ID || !process.env.AGORA_APP_CERTIFICATE) {
         return res.status(500).json({
            error: "Agora credentials not configured"
         });
      }

      const expirationTimeInSeconds = 3600;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      const token = RtcTokenBuilder.buildTokenWithUid(
         process.env.AGORA_APP_ID,
         process.env.AGORA_APP_CERTIFICATE,
         channelName,
         Number(uid),
         RtcRole.PUBLISHER,
         privilegeExpiredTs
      );

      res.json({
         token,
         appId: process.env.AGORA_APP_ID,
         channelName,
         uid
      });
   } catch (error) {
      console.error("Error generating token:", error);
      res.status(500).json({ error: "Failed to generate token" });
   }
};


const generateVoiceToken = async (req, res) => {
   try {
      const { channelName, uid } = req.body;

      if (!channelName || !uid) {
         return res.status(400).json({
            error: "channelName and uid are required"
         });
      }
      const appId = process.env.AGORA_APP_ID;
      const appCertificate = process.env.AGORA_APP_CERTIFICATE;

      console.log("Environment check:", {
         appId: appId ? "Set" : "Missing",
         appCertificate: appCertificate ? "Set" : "Missing"
      });

      if (!appId || !appCertificate) {
         return res.status(500).json({
            error: "Agora credentials not configured. Please check your environment variables.",
            details: {
               appId: appId ? "Set" : "Missing",
               appCertificate: appCertificate ? "Set" : "Missing"
            }
         });
      }
      const token = RtcTokenBuilder.buildTokenWithUid(
         appId,
         appCertificate,
         channelName,
         uid,
         RtcRole.PUBLISHER,
         0
      );
      console.log("Token generated successfully for:", { channelName, uid });
      res.json({
         token,
         appId: appId,
         channelName,
         uid,
         callType: "voice"
      });
   } catch (error) {
      console.error("Error generating voice token:", error);
      res.status(500).json({
         error: "Failed to generate voice token",
         details: error.message
      });
   }
}

const getCaller_Receiver_Details = async (req, res) => {
   try {
      const { callerId, receiverId } = req.params || req.query;
      // console.log("req.params", req);
      console.log("callerId", callerId);
      console.log("receiverId", receiverId);
      if (!callerId || !receiverId) {
         return res.status(400).json({
            error: "callerId and receiverId are required"
         });
      }
      if (!mongoose.Types.ObjectId.isValid(callerId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
         return res.status(400).json({
            error: "Invalid callerId or receiverId"
         });
      }
      const caller = await User.findById({ _id: callerId });
      const receiver = await User.findById({ _id: receiverId });

      if (!caller || !receiver) {
         return res.status(400).json({
            error: "Caller or receiver not found"
         });
      }
      const payload = {

         caller: {
            _id: caller._id,
            fullname: caller.fullname,
            fees: caller.fees,
            profileImage: caller.profileImage
         },

         receiver: {
            _id: receiver._id,
            fullname: receiver.fullname,
            fees: receiver.fees,
            profileImage: receiver.profileImage
         }

      }


      res.status(200).json({
         success: true,
         payload
      });
   } catch (error) {
      console.error("Error getting caller and receiver details:", error);
      res.status(500).json({
         error: "Failed to get caller and receiver details",
         details: error.message
      });
   }
}

module.exports = { generateToken, generateVoiceToken, getCaller_Receiver_Details };