const mongoose = require("mongoose");
const shop = new mongoose.Schema({
  instanceId: { type: String, required: true, unique: true },
  appDefId: String,
  siteOwnerId: String,
  siteMemberId: String,
  accessToken: String,
  tokenExpiry: Number,

  adminPersenTage: {
    type: mongoose.Schema.Types.Decimal128,
    default: mongoose.Types.Decimal128.fromString("0"),
  },

  adminWalletBalance: {
    type: mongoose.Schema.Types.Decimal128,
    default: mongoose.Types.Decimal128.fromString("0"),
  },
  appEnabled: {
    type: Boolean,
    default: false,
  },
  vouchers: [
    {
      voucherCode: String,
      name: String,
      active: { type: Boolean, default: true },
      totalCoin: Number,
      extraCoin: Number,
      wixProductId: String,
      wixProductSlug: String,
      wixVariantId: String, // Catalog V3 default variant (needed for checkout catalogReference.options)
      catalogVersion: String, // "V1" | "V3" (normalized from V1_CATALOG / V3_CATALOG)
      price: Number,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  accountPlanInfo: [
    {
      planName: String,
      planType: String,
      planAmount: String,
      currency: String,
    },
  ],
  activeChargeId: {
    type: String,
    default: "",
  },
  planStatus: {
    type: String,
    default: "free",
  },
  currency: {
    type: String,
    default: "$",
    // required: true,
  },
  currencyCode: {
    type: String,
    // required: true,
  },
  shop_Domain: String,
  installedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const shopModel = mongoose.models.shopifyShop || mongoose.model("shopifyShop", shop);

module.exports = { shopModel };
