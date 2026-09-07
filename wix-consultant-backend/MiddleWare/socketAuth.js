const mongoose = require("mongoose");
const JWT = require("jsonwebtoken");
const { User } = require("../Modal/userSchema");

function getHandshakeToken(socket) {
  const auth = socket.handshake.auth || {};
  if (auth.token) return auth.token;
  const header = socket.handshake.headers?.authorization;
  if (header && typeof header === "string") {
    const m = header.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : header;
  }
  return null;
}

/** Optional: verify consultant JWT matches register id (does not set socket.data.userId). */
function verifyRegisterToken(token, expectedUserId) {
  if (!token) return true;
  try {
    const decoded = JWT.verify(token, process.env.JWT_SECRET_KEY);
    const jwtUid = String(decoded._id || decoded.id || "");
    if (!jwtUid) return true;
    return jwtUid === String(expectedUserId);
  } catch {
    return true;
  }
}

function requireRegisteredSocket(socket) {
  return Boolean(socket.data.userId);
}

function assertPartyToEvent(socket, payload, keys = ["callerId", "receiverId"]) {
  const bound = socket.data.userId;
  if (!bound) return false;
  const allowed = keys
    .map((k) => payload?.[k])
    .filter(Boolean)
    .map(String);
  if (allowed.length === 0) return false;
  return allowed.includes(bound);
}

/**
 * Authoritative registration — `register` event sets the socket user.
 * JWT (consultant) is optional; stale JWT from another user must not block customer register.
 */
async function registerSocketUser(socket, user_Id, onlineUsers) {
  if (!mongoose.Types.ObjectId.isValid(user_Id)) {
    console.warn("[socket] register invalid id:", user_Id);
    return false;
  }

  const uid = String(user_Id);
  const token = getHandshakeToken(socket);

  if (token) {
    const tokenOk = verifyRegisterToken(token, uid);
    if (!tokenOk) {
      console.warn(
        "[socket] register: stale JWT ignored, binding",
        uid,
        "(handshake had different user)"
      );
    }
  }

  const user = await User.findById(uid).select("_id userType");
  if (!user) {
    console.warn("[socket] register rejected: user not in DB", uid);
    return false;
  }

  const previousUid = socket.data.userId;
  if (previousUid && previousUid !== uid) {
    socket.leave(previousUid);
    if (onlineUsers.get(previousUid) === socket.id) {
      onlineUsers.delete(previousUid);
    }
  }

  // One user may legitimately hold several sockets (consultant dashboard +
  // dedicated call tab, or several browser tabs). They all live in room `uid`
  // and emitToUser de-duplicates, so an existing socket is NOT stale: keep it
  // registered. (Disconnecting it here was what left the dashboard connected
  // but unregistered after every call.)
  const existingSocketId = onlineUsers.get(uid);
  if (existingSocketId && existingSocketId !== socket.id) {
    console.log(`[socket] additional connection for ${uid}: ${existingSocketId} + ${socket.id}`);
  }

  socket.data.userId = uid;
  socket.data.userType = user.userType;
  socket.join(uid);
  onlineUsers.set(uid, socket.id);

  await User.findByIdAndUpdate(uid, { isActive: true });

  console.log(
    `[socket] registered ${uid} (${user.userType}) → socket ${socket.id}`
  );
  return true;
}

module.exports = {
  assertPartyToEvent,
  requireRegisteredSocket,
  registerSocketUser,
  getHandshakeToken,
  verifyRegisterToken,
};
