import { createSlice } from "@reduxjs/toolkit";

/**
 * localStorage is a convenience hint only — the server's active-session
 * endpoint / `chatResumed` event overwrite it on load. It never decides
 * whether billing happens.
 */
const getPersistedChatTimer = () => {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("chatTimer");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.startTime || !parsed.transactionId) return null;
        return {
            transactionId: parsed.transactionId,
            startTime: parsed.startTime,
            isRunning: Boolean(parsed.isRunning),
            userId: parsed.userId || null,
            shopId: parsed.shopId || null,
            consultantId: parsed.consultantId || null,
        };
    } catch (error) {
        return null;
    }
};

const emptyTimer = () => ({
    transactionId: null,
    startTime: null,
    isRunning: false,
    userId: null,
    shopId: null,
    consultantId: null,
});

const MAX_NOTIFICATIONS = 50;

const socketSlice = createSlice({
    name: "socket",
    initialState: {
        isConnected: false,
        activeUsers: [],
        messages: [],
        insufficientBalance: null,
        isChatAccepted: null,
        chatTimer: getPersistedChatTimer() || emptyTimer(),
        autoChatEnded: null,
        incomingCall: null,
        callAccepted: null,
        callEnded: null,
        callRejected: null,
        confirmChat: null,
        /** Final result of the last ended chat: { chatId, endedBy, endReason, durationSeconds, finalAmount, … } */
        chatEndSummary: null,
        /** Other participant's link state: { chatId, role, connected, graceMs, since } */
        peerConnection: null,
        /** Last server rejection of a message: { reason, message, at } */
        messageRejected: null,
        /** Bell feed (session-scoped): [{ id, type:"message"|"missed_call", title, text, from, at, read }] */
        notifications: [],
        /** Latest call lifecycle event from the server: { type, payload, at } */
        callEvent: null,
        /** Final result of the last ended call (server payload) */
        callEndSummary: null,
        /** Other call participant link state: { callId, role, connected, graceMs, since } */
        callPeer: null,
    },
    reducers: {
        setConnected: (state, action) => {
            state.isConnected = action.payload;
        },
        setActiveUsers: (state, action) => {
            state.activeUsers = action.payload;
        },
        addMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        markMessagesSeen: (state, action) => {
            const { senderId } = action.payload;
            state.messages = state.messages.map((msg) =>
                msg.senderId === senderId ? { ...msg, seen: true } : msg
            );
        },
        setInsufficientBalanceError: (state, action) => {
            state.insufficientBalance = action.payload;
        },
        setChatAccepted: (state, action) => {
            state.isChatAccepted = action.payload;
        },
        setChatTimerStarted: (state, action) => {
            const p = action.payload || {};
            Object.assign(state.chatTimer, {
                transactionId: p.transactionId || p.chatId,
                startTime: p.startTime || p.startedAt,
                isRunning: true,
                userId: p.userId || state.chatTimer.userId || null,
                shopId: p.shopId || state.chatTimer.shopId || null,
                consultantId: p.consultantId || state.chatTimer.consultantId || null,
            });
            state.chatEndSummary = null;
            state.peerConnection = null;
            try {
                localStorage.setItem("chatTimer", JSON.stringify(state.chatTimer));
            } catch (error) {
                // ignore storage errors
            }
        },
        setChatTimerStopped: (state) => {
            state.chatTimer = emptyTimer();
            state.peerConnection = null;
            try {
                localStorage.removeItem("chatTimer");
            } catch (error) {
                // ignore storage errors
            }
        },
        /** Server said the session is over — keep the summary for the UI. */
        setChatEnded: (state, action) => {
            const p = action.payload || null;
            state.chatEndSummary = p;
            state.chatTimer = emptyTimer();
            state.peerConnection = null;
            try {
                localStorage.removeItem("chatTimer");
            } catch (error) {
                // ignore storage errors
            }
        },
        clearChatEndSummary: (state) => {
            state.chatEndSummary = null;
        },
        setPeerConnection: (state, action) => {
            state.peerConnection = action.payload;
        },
        setMessageRejected: (state, action) => {
            state.messageRejected = action.payload ? { ...action.payload, at: Date.now() } : null;
        },
        /* ── Bell feed ── */
        pushNotification: (state, action) => {
            const n = action.payload;
            if (!n || !n.id) return;
            if (state.notifications.some((x) => x.id === n.id)) return;
            state.notifications.unshift({ read: false, at: Date.now(), ...n });
            if (state.notifications.length > MAX_NOTIFICATIONS) state.notifications.length = MAX_NOTIFICATIONS;
        },
        /** A missed call: the caller name comes from the last incoming-call payload. */
        pushMissedCall: (state, action) => {
            const p = action.payload || {};
            const id = `missed:${p.callId || Date.now()}`;
            if (state.notifications.some((x) => x.id === id)) return;
            // Callee only: either this consultant had the incoming card for this call, or the
            // legacy callId (caller_receiver_channel) names us as the receiver.
            const legacy = String(p.callId || "").split("_");
            const isCallee =
                (state.incomingCall && String(state.incomingCall.callId) === String(p.callId)) ||
                (legacy.length >= 3 && p.me && legacy[1] === String(p.me));
            if (!isCallee) return;
            const callerId = state.incomingCall?.callerId || (legacy.length >= 3 ? legacy[0] : null);
            state.notifications.unshift({
                id,
                type: "missed_call",
                title: "Missed call",
                text: `${state.incomingCall?.callerName || "A client"} tried to ${state.incomingCall?.callType === "video" ? "video call" : "call"} you`,
                from: callerId,
                read: false,
                at: Date.now(),
            });
            if (state.notifications.length > MAX_NOTIFICATIONS) state.notifications.length = MAX_NOTIFICATIONS;
        },
        markAllNotificationsRead: (state) => {
            state.notifications.forEach((n) => { n.read = true; });
        },
        /** Messages from a sender are read once their conversation is open. */
        dismissNotificationsFrom: (state, action) => {
            const from = String(action.payload || "");
            state.notifications.forEach((n) => {
                if (n.type === "message" && String(n.from) === from) n.read = true;
            });
        },
        clearNotifications: (state) => {
            state.notifications = [];
        },
        setCallEvent: (state, action) => {
            state.callEvent = { ...action.payload, at: Date.now() };
            if (action.payload?.type === "ended") {
                state.callEndSummary = action.payload.payload || null;
                state.callPeer = null;
            }
            if (["connected", "accepted"].includes(action.payload?.type)) state.callEndSummary = null;
        },
        clearCallEvent: (state) => { state.callEvent = null; },
        clearCallEndSummary: (state) => { state.callEndSummary = null; },
        setCallPeer: (state, action) => { state.callPeer = action.payload; },
        setAutoChatEnded: (state, action) => {
            state.autoChatEnded = action.payload;
        },
        setIncomingCall: (state, action) => {
            state.incomingCall = action.payload;
        },
        setCallAccepted: (state, action) => {
            state.callAccepted = action.payload;
            localStorage.setItem("callAccepted", JSON.stringify(state.callAccepted));
        },
        setCallEnded: (state, action) => {
            state.callEnded = action.payload;
        },
        setCallRejected: (state, action) => {
            state.callRejected = action.payload;
            if (state.callRejected) {
                localStorage.setItem("callRejected", true);
            }
        },
        clearMessages: (state) => {
            state.messages = [];
        },
        setConfirmChat: (state, action) => {
            state.confirmChat = action.payload;
        },
        // No-op kept for backward compatibility; connection lives in sokectProvider.js
        connectSocket: () => {},
    },
});

export const {
    setConnected,
    setActiveUsers,
    addMessage,
    markMessagesSeen,
    setInsufficientBalanceError,
    setChatAccepted,
    setChatTimerStarted,
    setChatTimerStopped,
    setChatEnded,
    clearChatEndSummary,
    setPeerConnection,
    setMessageRejected,
    pushNotification,
    pushMissedCall,
    markAllNotificationsRead,
    dismissNotificationsFrom,
    clearNotifications,
    setCallEvent,
    clearCallEvent,
    clearCallEndSummary,
    setCallPeer,
    setAutoChatEnded,
    setIncomingCall,
    setCallAccepted,
    setCallEnded,
    setCallRejected,
    clearMessages,
    connectSocket,
    setConfirmChat,
} = socketSlice.actions;

export default socketSlice.reducer;
