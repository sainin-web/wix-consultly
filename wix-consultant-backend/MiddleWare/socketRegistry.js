/**
 * In-memory map: Mongo userId -> active socket.id
 * Rooms: each socket joins `userId` room on register for io.to(userId) delivery
 */

function broadcastOnlineUsers(io, onlineUsers) {
  const list = Array.from(onlineUsers.keys());
  io.emit("activeUsers", list);
  return list;
}

async function emitToUser(io, onlineUsers, userId, event, payload) {
  if (!userId) return { delivered: false, roomCount: 0 };
  const uid = String(userId);
  io.to(uid).emit(event, payload);
  const socketId = onlineUsers.get(uid);
  if (socketId) {
    io.to(socketId).emit(event, payload);
  }
  let roomCount = 0;
  try {
    roomCount = (await io.in(uid).fetchSockets()).length;
  } catch {
    roomCount = socketId ? 1 : 0;
  }
  return {
    delivered: roomCount > 0 || Boolean(socketId),
    roomCount,
  };
}

function queuePending(map, userId, payload) {
  const uid = String(userId);
  const list = map.get(uid) || [];
  list.push(payload);
  map.set(uid, list);
}

async function replayPending(io, onlineUsers, map, userId, event) {
  const uid = String(userId);
  const list = map.get(uid);
  if (!list?.length) return 0;
  for (const payload of list) {
    await emitToUser(io, onlineUsers, uid, event, payload);
  }
  map.delete(uid);
  return list.length;
}

function removeSocketFromRegistry(socket, onlineUsers) {
  const uid = socket.data?.userId;
  if (!uid) return null;
  if (onlineUsers.get(uid) === socket.id) {
    onlineUsers.delete(uid);
  }
  return uid;
}

module.exports = {
  broadcastOnlineUsers,
  emitToUser,
  queuePending,
  replayPending,
  removeSocketFromRegistry,
};
