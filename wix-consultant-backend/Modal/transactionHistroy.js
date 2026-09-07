const mongoose = require("mongoose");

/**
 * One consultation transaction (chat / voice / video).
 *
 * For chat sessions this document IS the session record:
 *   active → ending → completed   (see services/chatSession.js)
 * `startTime` / `endTime` are the billing authority.
 */
const transactionSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ragisterUser",
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ragisterUser",
        required: true
    },
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "shopModel",
        required: true
    },
    amount: {
        type: Number,
        default: 0
    },
    debitFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ragisterUser",
        // required: true
    },
    creditTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ragisterUser",
        // required: true
    },
    adminAmount: {
        type: Number,
        default: 0
    },
    consultantAmount: {
        type: Number,
        default: 0
    },
    startTime: {
        type: Date,
        default: null
    },
    endTime: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ["active", "ending", "ended", "completed"],
        default: "active"
    },
    endedBy: {
        type: String
    },
    endReason: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ["chat", "voice", "video"],
        required: true
    },

    // ── Chat session lifecycle (server-authoritative) ──
    totalSeconds: {
        type: Number,
        default: null
    },
    billingFinalizedAt: {
        type: Date,
        default: null
    },
    userConnected: {
        type: Boolean,
        default: true
    },
    consultantConnected: {
        type: Boolean,
        default: true
    },
    userDisconnectedAt: {
        type: Date,
        default: null
    },
    consultantDisconnectedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

transactionSchema.index({ type: 1, status: 1, senderId: 1 });
transactionSchema.index({ type: 1, status: 1, receiverId: 1 });

const TransactionHistroy = mongoose.model("Transaction", transactionSchema);

module.exports = { TransactionHistroy };
