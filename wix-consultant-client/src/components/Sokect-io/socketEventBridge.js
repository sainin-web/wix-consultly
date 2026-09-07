/**
 * Binds Redux dispatch to the current socket instance.
 * Must re-run after destroySocket() / reconnect so incoming-call reaches sokectSlice.
 *
 * Every listener is registered exactly once per event: bindSocketListeners()
 * always does socket.off(event, handler) before socket.on(event, handler) with
 * the SAME stable handler reference, so repeated calls (reconnects, route
 * changes, re-renders) never stack duplicate listeners.
 */
import { getSocket } from "./SokectConfig";
import { getSocketRegisterId } from "../../utils/wixStorage";
import {
  setConnected,
  setActiveUsers,
  addMessage,
  markMessagesSeen,
  setInsufficientBalanceError,
  setChatAccepted,
  setChatTimerStarted,
  setChatEnded,
  setAutoChatEnded,
  setIncomingCall,
  setCallAccepted,
  setCallEnded,
  setCallRejected,
  setConfirmChat,
  setPeerConnection,
  setMessageRejected,
  pushNotification,
  pushMissedCall,
  setCallEvent,
  setCallPeer,
} from "../Redux/slices/sokectSlice";

let dispatchRef = null;
const handlers = {};

const EVENTS = [
  ["incoming-call", "incomingCall"],
  ["connect", "connect"],
  ["disconnect", "disconnect"],
  ["registerAck", "registerAck"],
  ["activeUsers", "activeUsers"],
  ["receiveMessage", "receiveMessage"],
  ["seenUpdate", "seenUpdate"],
  ["balanceError", "balanceError"],
  ["userChatAccepted", "userChatAccepted"],
  ["chatTimerStarted", "chatTimerStarted"],
  ["chatResumed", "chatResumed"],
  ["chatEnded", "chatEnded"],
  ["chatEndFailed", "chatEndFailed"],
  ["autoChatEnded", "autoChatEnded"],
  ["participantDisconnected", "participantDisconnected"],
  ["participantReconnected", "participantReconnected"],
  ["messageRejected", "messageRejected"],
  ["call-accepted-started", "callAcceptedStarted"],
  ["call-missed", "callMissed"],
  ["callEnded", "callEnded"],
  ["call-ended-rejected", "callEndedRejected"],
  ["acceptUser", "acceptUser"],
  ["callRinging", "callRinging"],
  ["callAccepted", "callAccepted"],
  ["callConnected", "callConnected"],
  ["callRejected", "callRejected"],
  ["callCancelled", "callCancelled"],
  ["callMissed", "callMissed"],
  ["callFailed", "callFailed"],
  ["callResumed", "callResumed"],
  ["creditsWarning", "creditsWarning"],
  ["creditsExhausted", "creditsExhausted"],
];

export function setSocketDispatch(dispatch) {
  dispatchRef = dispatch;
}

function createHandlers() {
  handlers.incomingCall = (call) => dispatchRef?.(setIncomingCall(call));
  handlers.connect = () => {
    dispatchRef?.(setConnected(true));
    console.log("[socket] connected (bridge)");
  };
  handlers.disconnect = (reason) => {
    dispatchRef?.(setConnected(false));
    console.log("[socket] disconnected (bridge)", reason);
  };
  handlers.registerAck = (payload) => {
    if (payload?.success) dispatchRef?.(setConnected(true));
  };
  handlers.activeUsers = (list) => dispatchRef?.(setActiveUsers(list));
  handlers.receiveMessage = (msg) => {
    dispatchRef?.(addMessage(msg));
    // Bell feed: only messages addressed to THIS user (not our own echoes).
    const me = getSocketRegisterId();
    if (msg?._id && me && String(msg.receiverId) === String(me) && String(msg.senderId) !== String(me)) {
      dispatchRef?.(
        pushNotification({
          id: `msg:${msg._id}`,
          type: "message",
          title: msg.senderName || "New message",
          text: msg.text || "",
          from: String(msg.senderId),
          shopId: msg.shop_id ? String(msg.shop_id) : null,
        }),
      );
    }
  };
  handlers.seenUpdate = (data) => dispatchRef?.(markMessagesSeen(data));
  handlers.balanceError = (err) => dispatchRef?.(setInsufficientBalanceError(err));
  handlers.userChatAccepted = (res) => dispatchRef?.(setChatAccepted(res?.message));
  handlers.chatTimerStarted = (res) => {
    console.log("[CHAT] chatTimerStarted", res?.transactionId);
    dispatchRef?.(setChatTimerStarted(res));
  };
  /** Server restored an active session on (re)register — DB is the authority. */
  handlers.chatResumed = (snapshot) => {
    console.log("[CHAT] chatResumed from server", snapshot?.chatId);
    if (snapshot?.status === "active") {
      dispatchRef?.(
        setChatTimerStarted({
          transactionId: snapshot.chatId,
          startTime: snapshot.startedAt,
          userId: snapshot.userId,
          shopId: snapshot.shopId,
          consultantId: snapshot.consultantId,
        }),
      );
    }
  };
  handlers.chatEnded = (payload) => {
    console.log("[CHAT] chatEnded", payload?.chatId || payload?.transactionId, payload?.endReason || payload?.reason);
    dispatchRef?.(setChatEnded(payload));
  };
  handlers.chatEndFailed = (payload) => {
    console.warn("[CHAT ERROR] chatEndFailed", payload);
  };
  handlers.autoChatEnded = (data) => dispatchRef?.(setAutoChatEnded(data));
  handlers.participantDisconnected = (p) => {
    const state = { ...p, connected: false, since: Date.now() };
    if (p?.kind === "call") dispatchRef?.(setCallPeer(state));
    else dispatchRef?.(setPeerConnection(state));
  };
  handlers.participantReconnected = (p) => {
    const state = { ...p, connected: true, since: Date.now() };
    if (p?.kind === "call") dispatchRef?.(setCallPeer(state));
    else dispatchRef?.(setPeerConnection(state));
  };
  const callEv = (type) => (payload) => {
    console.log("[CALL] event", type, payload?.callId || "");
    dispatchRef?.(setCallEvent({ type, payload }));
  };
  handlers.callRinging = callEv("ringing");
  handlers.callAccepted = callEv("accepted");
  handlers.callConnected = callEv("connected");
  handlers.callRejected = callEv("rejected");
  handlers.callCancelled = callEv("cancelled");
  handlers.callFailed = callEv("failed");
  handlers.callResumed = callEv("resumed");
  handlers.creditsWarning = callEv("creditsWarning");
  handlers.creditsExhausted = callEv("creditsExhausted");
  handlers.messageRejected = (p) => {
    console.warn("[CHAT] message rejected by server", p);
    dispatchRef?.(setMessageRejected(p));
  };
  handlers.callAcceptedStarted = (data) => dispatchRef?.(setCallAccepted(data));
  handlers.callMissed = (data) => {
    dispatchRef?.(setCallEnded(data));
    dispatchRef?.(setCallEvent({ type: "missed", payload: data }));
    // The bell entry is decided in the reducer (callee only).
    dispatchRef?.(pushMissedCall({ ...data, me: getSocketRegisterId() }));
  };
  handlers.callEnded = (data) => {
    dispatchRef?.(setCallEnded(data));
    if (data?.callId) dispatchRef?.(setCallEvent({ type: "ended", payload: data }));
  };
  handlers.callEndedRejected = (data) => {
    dispatchRef?.(setCallRejected(data));
    dispatchRef?.(setCallEnded(data));
  };
  handlers.acceptUser = (data) => dispatchRef?.(setConfirmChat(data));
}

/** Attach all app listeners to the live socket instance (idempotent). */
export function bindSocketListeners() {
  if (!dispatchRef) return;
  const socket = getSocket();
  if (!handlers.incomingCall) createHandlers();

  for (const [event, key] of EVENTS) {
    socket.off(event, handlers[key]);
    socket.on(event, handlers[key]);
  }

  console.log("[socket] listeners bound to instance", socket.id || "(pending)");
}
