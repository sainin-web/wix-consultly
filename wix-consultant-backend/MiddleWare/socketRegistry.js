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
  // Direct copy ONLY if that socket is not already in its room — otherwise the
  // same socket would receive every event twice.
  if (socketId) {
    const sock = io.sockets?.sockets?.get(socketId);
    if (sock && !sock.rooms?.has(uid)) sock.emit(event, payload);
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

/**
 * Drop this socket from the registry. If the user still has another registered
 * socket (dashboard tab while the call tab closes, etc.), point the map at it
 * so the user stays "online"; only delete when no socket is left.
 */
function removeSocketFromRegistry(socket, onlineUsers) {
  const uid = socket.data?.userId;
  if (!uid) return null;
  if (onlineUsers.get(uid) === socket.id) {
    let replacement = null;
    try {
      const room = socket.nsp?.adapter?.rooms?.get(uid);
      if (room) {
        for (const sid of room) {
          if (sid === socket.id) continue;
          const other = socket.nsp.sockets.get(sid);
          if (other && other.data?.userId === uid && other.connected) { replacement = sid; break; }
        }
      }
    } catch (e) { /* fall through → delete */ }
    if (replacement) {
      onlineUsers.set(uid, replacement);
      console.log(`[socket] ${uid} still online via ${replacement} (closed ${socket.id})`);
    } else {
      onlineUsers.delete(uid);
    }
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
