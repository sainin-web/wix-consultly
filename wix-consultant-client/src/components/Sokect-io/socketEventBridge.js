/**
 * Binds Redux dispatch to the current socket instance.
 * Must re-run after destroySocket() / reconnect so incoming-call reaches sokectSlice.
 */
import { getSocket } from "./SokectConfig";
import {
  setConnected,
  setActiveUsers,
  addMessage,
  markMessagesSeen,
  setInsufficientBalanceError,
  setChatAccepted,
  setChatTimerStarted,
  setChatTimerStopped,
  setAutoChatEnded,
  setIncomingCall,
  setCallAccepted,
  setCallEnded,
  setCallRejected,
  setConfirmChat,
} from "../Redux/slices/sokectSlice";

let dispatchRef = null;
const handlers = {};

function onIncomingCall(call) {
  console.log("[socket] incoming-call event → Redux", call);
  dispatchRef?.(setIncomingCall(call));
}

function onConnect() {
  dispatchRef?.(setConnected(true));
  console.log("[socket] connected (bridge)");
}

function onDisconnect(reason) {
  dispatchRef?.(setConnected(false));
  console.log("[socket] disconnected (bridge)", reason);
}

function onRegisterAck(payload) {
  if (payload?.success) dispatchRef?.(setConnected(true));
}

export function setSocketDispatch(dispatch) {
  dispatchRef = dispatch;
}

/** Attach all app listeners to the live socket instance */
export function bindSocketListeners() {
  if (!dispatchRef) return;

  const socket = getSocket();

  if (!handlers.incomingCall) {
    handlers.incomingCall = onIncomingCall;
    handlers.connect = onConnect;
    handlers.disconnect = onDisconnect;
    handlers.registerAck = onRegisterAck;
    handlers.activeUsers = (list) => dispatchRef(setActiveUsers(list));
    handlers.receiveMessage = (msg) => dispatchRef(addMessage(msg));
    handlers.seenUpdate = (data) => dispatchRef(markMessagesSeen(data));
    handlers.balanceError = (err) =>
      dispatchRef(setInsufficientBalanceError(err));
    handlers.userChatAccepted = (res) =>
      dispatchRef(setChatAccepted(res.message));
    handlers.chatTimerStarted = (res) =>
      dispatchRef(setChatTimerStarted(res));
    handlers.chatEnded = (payload) => {
      console.log("[socket] chatEnded → stop timer", payload);
      dispatchRef(setChatTimerStopped());
    };
    handlers.autoChatEnded = (data) => dispatchRef(setAutoChatEnded(data));
    handlers.callAcceptedStarted = (data) =>
      dispatchRef(setCallAccepted(data));
    handlers.callMissed = (data) => dispatchRef(setCallEnded(data));
    handlers.callEnded = (data) => dispatchRef(setCallEnded(data));
    handlers.callEndedRejected = (data) => {
      dispatchRef(setCallRejected(data));
      dispatchRef(setCallEnded(data));
    };
    handlers.acceptUser = (data) => dispatchRef(setConfirmChat(data));
  }

  socket.off("incoming-call", handlers.incomingCall);
  socket.on("incoming-call", handlers.incomingCall);

  socket.off("connect", handlers.connect);
  socket.on("connect", handlers.connect);

  socket.off("disconnect", handlers.disconnect);
  socket.on("disconnect", handlers.disconnect);

  socket.off("registerAck", handlers.registerAck);
  socket.on("registerAck", handlers.registerAck);

  socket.off("activeUsers", handlers.activeUsers);
  socket.on("activeUsers", handlers.activeUsers);

  socket.off("receiveMessage", handlers.receiveMessage);
  socket.on("receiveMessage", handlers.receiveMessage);

  socket.off("seenUpdate", handlers.seenUpdate);
  socket.on("seenUpdate", handlers.seenUpdate);

  socket.off("balanceError", handlers.balanceError);
  socket.on("balanceError", handlers.balanceError);

  socket.off("userChatAccepted", handlers.userChatAccepted);
  socket.on("userChatAccepted", handlers.userChatAccepted);

  socket.off("chatTimerStarted", handlers.chatTimerStarted);
  socket.on("chatTimerStarted", handlers.chatTimerStarted);

  socket.off("chatEnded", handlers.chatEnded);
  socket.on("chatEnded", handlers.chatEnded);

  socket.off("autoChatEnded", handlers.autoChatEnded);
  socket.on("autoChatEnded", handlers.autoChatEnded);

  socket.off("call-accepted-started", handlers.callAcceptedStarted);
  socket.on("call-accepted-started", handlers.callAcceptedStarted);

  socket.off("call-missed", handlers.callMissed);
  socket.on("call-missed", handlers.callMissed);

  socket.off("callEnded", handlers.callEnded);
  socket.on("callEnded", handlers.callEnded);

  socket.off("call-ended-rejected", handlers.callEndedRejected);
  socket.on("call-ended-rejected", handlers.callEndedRejected);

  socket.off("acceptUser", handlers.acceptUser);
  socket.on("acceptUser", handlers.acceptUser);

  console.log("[socket] listeners bound to instance", socket.id || "(pending)");
}
