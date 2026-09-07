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
