const mongoose = require("mongoose")

const missed = new mongoose.Schema({
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
   
    type: {
        type: String,
    },
    reason: {
        type: String,
    }
}, { timestamps: true })

const missCalled = mongoose.model("missCalleHistroy", missed)

module.exports = { missCalled }