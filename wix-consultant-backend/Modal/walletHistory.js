const mongoose = require("mongoose");
const walletHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ragisterUser",
        required: true
    },

    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "shopModel",
        required: true
    },
    customerId: {
        type: String,

    },

    amount: {
        type: Number,
        // required: true
    },
    currency: {
        type: String,
    },
    draftOrderId: {
        type: String,

    },
    invoiceUrl: {
        type: String,

    },

    transactionType: {
        type: String,
        enum: [
            "recharge",
            "bonus",
            "usage",          // call/chat/video cut
            "manual_credit",
            "manual_debit",
            "withdraw",
            "refund",
            "credit",
            "paid"
        ],
        required: true
    },

    referenceType: {
        type: String,
        enum: ["voice", "chat", "video", "recharge", "manual", "withdraw"],
        default: null
    },

    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },

    direction: {
        type: String,
        enum: ["credit", "debit", "paid"],
        required: true
    },

    description: {
        type: String,
        default: ""
    },

    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ragisterUser", // admin id
        default: null
    },

    status: {
        type: String,
        enum: ["success", "pending", "failed"],
        default: ""
    }
}, { timestamps: true });
const WalletHistory = mongoose.model("WalletHistory", walletHistorySchema);
module.exports = { WalletHistory };
