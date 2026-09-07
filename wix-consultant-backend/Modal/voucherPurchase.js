const mongoose = require("mongoose");

/**
 * One row per "Buy now" click. The voucher is SNAPSHOTTED at creation so a
 * later admin edit never changes what a pending purchase delivers.
 *
 * Lifecycle (server-owned, webhook-driven):
 *   PENDING ──(Wix order PAID, atomic claim)──▶ PROCESSING ──(tx commit)──▶ PAID
 *   PENDING ──(payment DECLINED/CANCELED)────▶ FAILED
 *   PENDING ──(user abandons / sweep)─────────▶ CANCELLED / EXPIRED
 * A late PAID webhook for an EXPIRED purchase is still honoured (money was taken).
 */
const STATUS = ["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED", "EXPIRED"];

const voucherPurchaseSchema = new mongoose.Schema(
  {
    purchaseId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "ragisterUser", required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "shopifyShop", required: true },
    wixInstanceId: { type: String, required: true, index: true },
    voucherId: { type: mongoose.Schema.Types.ObjectId, required: true },

    voucherSnapshot: {
      name: String,
      description: String,
      price: Number,
      currency: String,
      credits: Number, // totalCoin + extraCoin
      totalCoin: Number,
      extraCoin: Number,
      wixProductId: String,
      catalogVersion: String,
    },

    amount: { type: Number, required: true }, // price charged (server-side value)
    currency: { type: String, default: "" },
    credits: { type: Number, required: true }, // credits to add on PAID

    status: { type: String, enum: STATUS, default: "PENDING", index: true },

    wixCheckoutId: { type: String, index: true },
    wixCheckoutUrl: String,
    wixPurchaseFlowId: String,
    wixOrderId: { type: String, index: true },
    wixOrderNumber: Number,
    wixPaymentStatus: String,
    amountPaid: Number,
    amountMismatch: { type: Boolean, default: false },

    creditsAdded: { type: Boolean, default: false, index: true },
    walletHistoryId: { type: mongoose.Schema.Types.ObjectId, default: null },
    webhookEventIds: { type: [String], default: [] },
    lastError: { type: String, default: "" },

    paidAt: Date,
    failedAt: Date,
    cancelledAt: Date,
    processingAt: Date,
  },
  { timestamps: true },
);

voucherPurchaseSchema.index({ userId: 1, createdAt: -1 });

const VoucherPurchase = mongoose.models.VoucherPurchase || mongoose.model("VoucherPurchase", voucherPurchaseSchema);

module.exports = { VoucherPurchase, PURCHASE_STATUS: STATUS };
