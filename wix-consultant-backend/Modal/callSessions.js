const { mongoose } = require("mongoose");

/**
 * One audio/video call — THE session record (see services/callSession.js).
 *
 *   requested → ringing → accepted → connecting → active → ending → completed
 *                   └ cancelled / rejected / missed / failed
 *
 * Money lives in TransactionHistroy (transtionId), created only at "active".
 * connectedAt is the billing start; all timestamps are server-side.
 * Legacy statuses (ongoing/pending) remain in the enum so old documents load.
 */
const callSessionsSchema = new mongoose.Schema(
    {
        sessionId: { type: String, required: true, unique: true }, // Agora channel
        receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "ragisterUser", required: true }, // consultant
        callerId: { type: mongoose.Schema.Types.ObjectId, ref: "ragisterUser", required: true }, // customer
        callUniqueId: { type: String },
        transtionId: { type: String },
        callType: { type: String, enum: ["voice", "video"], default: "voice" },
        shopId: { type: String },

        status: {
            type: String,
            enum: [
                "requested", "ringing", "accepted", "connecting", "active", "ending",
                "completed", "rejected", "cancelled", "missed", "failed",
                "ongoing", "pending", // legacy
            ],
            default: "requested",
        },

        // lifecycle timestamps (server)
        requestedAt: { type: Date, default: null },
        ringingAt: { type: Date, default: null },
        acceptedAt: { type: Date, default: null },
        connectedAt: { type: Date, default: null }, // billing start
        startTime: { type: Date }, // legacy mirror of connectedAt
        endTime: { type: Date },

        // participants
        userJoined: { type: Boolean, default: false },
        consultantJoined: { type: Boolean, default: false },
        userConnected: { type: Boolean, default: true },
        consultantConnected: { type: Boolean, default: true },
        userDisconnectedAt: { type: Date, default: null },
        consultantDisconnectedAt: { type: Date, default: null },

        // outcome
        endedBy: { type: String, default: null },
        endReason: { type: String, default: null },
        totalSeconds: { type: Number, default: null },
        amount: { type: Number, default: null },
        consultantShare: { type: Number, default: null },
        adminShare: { type: Number, default: null },
        billingStatus: { type: String, enum: ["pending", "finalized", "none"], default: "pending" },
        billingFinalizedAt: { type: Date, default: null },

        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

callSessionsSchema.index({ receiverId: 1, status: 1 });
callSessionsSchema.index({ callerId: 1, status: 1 });
callSessionsSchema.index({ receiverId: 1, startTime: -1 });
callSessionsSchema.index({ callerId: 1, startTime: -1 });

const CallSession = mongoose.models.CallSession || mongoose.model("CallSession", callSessionsSchema);

module.exports = { CallSession };
