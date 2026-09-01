const mongoose = require("mongoose");

const ConsultantClientSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ragisterUser",
            // required: true
        },
        consultantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ragisterUser",
            required: true
        },
        shop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "shopifyShop",
            required: true
        },
      
    },
    { timestamps: true }
);

const ConsultantClient = mongoose.models.consultantClient || mongoose.model("consultantClient", ConsultantClientSchema);

module.exports = { ConsultantClient };
