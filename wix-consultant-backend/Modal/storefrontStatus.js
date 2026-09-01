const mongoose = require("mongoose");

/**
 * Additive collection for storefront onboarding.
 * Existing schemas (shopifyShop, ragisterUser, ...) are NOT modified.
 * One doc per app instance — records when the public widget last phoned home.
 */
const storefrontStatusSchema = new mongoose.Schema(
  {
    instanceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Last time the our-consultant widget resolved its instance from a live site
    lastSeenAt: {
      type: Date,
    },
    // Last time the merchant generated an editor deep link from the wizard
    deepLinkGeneratedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

const StorefrontStatus =
  mongoose.models.storefrontStatus ||
  mongoose.model("storefrontStatus", storefrontStatusSchema);

module.exports = { StorefrontStatus };
