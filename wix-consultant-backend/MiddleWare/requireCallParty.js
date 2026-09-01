const { User } = require("../Modal/userSchema");
const { verify_Token } = require("../Auth/auth");

function expectedChannelName(callerId, receiverId) {
  if (!callerId || !receiverId) return null;
  return `channel-${String(callerId).slice(-6)}-${String(receiverId).slice(-6)}`;
}

/**
 * Agora token minting: no JWT required for Wix guests, but channel must match
 * caller/receiver pair and both users must exist.
 */
async function requireCallParty(req, res, next) {
  try {
    const { channelName, uid, callerId, receiverId } = req.body || {};

    if (!channelName || uid === undefined) {
      return res.status(400).json({
        error: "channelName, uid, callerId, and receiverId are required",
      });
    }

    if (!callerId || !receiverId) {
      return res.status(400).json({
        error: "callerId and receiverId are required",
      });
    }

    const expected = expectedChannelName(callerId, receiverId);
    if (!expected || channelName !== expected) {
      return res.status(403).json({
        error: "Invalid channel for call participants",
      });
    }

    const [caller, receiver] = await Promise.all([
      User.findById(callerId).select("_id userType"),
      User.findById(receiverId).select("_id userType"),
    ]);

    if (!caller || !receiver) {
      return res.status(403).json({ error: "Invalid call participants" });
    }

    const jwtUser = await verify_Token(req);
    if (jwtUser && jwtUser._id) {
      const id = jwtUser._id.toString();
      if (id !== String(callerId) && id !== String(receiverId)) {
        return res.status(403).json({ error: "Token does not match call parties" });
      }
    }

    req.callCallerId = String(callerId);
    req.callReceiverId = String(receiverId);
    next();
  } catch (err) {
    console.error("requireCallParty:", err.message);
    return res.status(500).json({ error: "Call authorization failed" });
  }
}

module.exports = { requireCallParty, expectedChannelName };
