const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ragisterUser",
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ragisterUser",
        required: true,
    },
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "shopifyShop",
        required: true,
    },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
});

messageSchema.index({ shop_id: 1, senderId: 1, receiverId: 1, timestamp: -1 });

const MessageModal = mongoose.model("Message", messageSchema);

module.exports = { MessageModal }

