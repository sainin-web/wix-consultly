const mongoose = require("mongoose");

const WithdrawalSchema = new mongoose.Schema({
    consultantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ragisterUser",
        required: true
    },

    shopId: String,

    amount: {
        type: Number,
        required: true
    },

    note: String,

    status: {
        type: String,
        enum: ["pending", "paid", "declined"],
        default: "pending"
    },
    transactionNumber: {
        type: String,
        default: ""
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true
    },

    paidAt: Date
});
const WithdrawalRequestSchema = mongoose.model("WithdrawalRequest", WithdrawalSchema);

module.exports = { WithdrawalRequestSchema }
