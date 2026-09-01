const axios = require("axios");
const mongoose = require("mongoose");
const { shopModel } = require("../Modal/shopify");
const { User } = require("../Modal/userSchema");
const { StorefrontStatus } = require("../Modal/storefrontStatus");
const { handleWixInstall } = require("../services/wix.service");

// Widget heartbeat older than this = "not connected"
const CONNECTED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Resolve a shop from the :adminId route param.
 * Admin pages send the Mongo _id (localStorage wix_id); accept instanceId too.
 */
const findShopByAdminId = async (adminId) => {
  if (!adminId) return null;
  if (mongoose.Types.ObjectId.isValid(adminId)) {
    const byId = await shopModel.findById(adminId);
    if (byId) return byId;
  }
  return shopModel.findOne({ instanceId: adminId });
};

/**
 * Fire-and-forget heartbeat, called from the existing /wix/get-instance
 * route whenever the public widget resolves its instance from a live site.
 * Never throws — must not affect the widget response.
 */
const recordStorefrontHeartbeat = (instanceId) => {
  if (!instanceId) return;
  StorefrontStatus.findOneAndUpdate(
    { instanceId },
    { $set: { lastSeenAt: new Date() } },
    { upsert: true },
  ).catch((err) =>
    console.error("storefront heartbeat error:", err.message),
  );
};

/**
 * GET /api/onboarding/storefront-status/:adminId  (requireAdminAuth)
 * Returns everything the setup wizard needs to render its steps.
 */
const getStorefrontStatus = async (req, res) => {
  try {
    const shop = await findShopByAdminId(req.params.adminId);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    const [consultantCount, status] = await Promise.all([
      User.countDocuments({
        shop_id: String(shop._id),
        userType: "consultant",
      }),
      StorefrontStatus.findOne({ instanceId: shop.instanceId }),
    ]);

    const lastSeenAt = status?.lastSeenAt || null;
    const storefrontConnected =
      !!lastSeenAt &&
      Date.now() - new Date(lastSeenAt).getTime() < CONNECTED_WINDOW_MS;

    return res.status(200).json({
      success: true,
      appInstalled: true, // reaching this authed endpoint implies installation
      installedAt: shop.installedAt || null,
      appEnabled: !!shop.appEnabled,
      consultantCount,
      storefrontConnected,
      lastSeenAt,
      deepLinkGeneratedAt: status?.deepLinkGeneratedAt || null,
    });
  } catch (error) {
    console.error("getStorefrontStatus error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load storefront status" });
  }
};

/**
 * POST /api/onboarding/editor-deep-link/:adminId  (requireAdminAuth)
 * Official Wix Editor Deep Link API (Beta): returns a URL that opens the
 * merchant's editor with the app's Custom Element component already added.
 * https://dev.wix.com/docs/rest/api-reference/app-management/about-the-editor-deep-link-api
 */
const createEditorDeepLink = async (req, res) => {
  try {
    const shop = await findShopByAdminId(req.params.adminId);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Reuse existing install/token logic — refreshes only when near expiry
    const freshShop = await handleWixInstall({ instanceId: shop.instanceId });

    const wixRes = await axios.post(
      "https://www.wixapis.com/apps/v1/post-installation/editor-deep-link",
      {},
      {
        headers: {
          Authorization: freshShop.accessToken,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    const url =
      wixRes.data?.url ||
      wixRes.data?.deepLink ||
      wixRes.data?.editorUrl ||
      null;

    if (!url) {
      console.error("editor-deep-link: unexpected response", wixRes.data);
      return res.status(200).json({
        success: false,
        fallback: true,
        message: "Wix did not return an editor link",
      });
    }

    StorefrontStatus.findOneAndUpdate(
      { instanceId: shop.instanceId },
      { $set: { deepLinkGeneratedAt: new Date() } },
      { upsert: true },
    ).catch(() => {});

    return res.status(200).json({ success: true, url });
  } catch (error) {
    console.error(
      "createEditorDeepLink error:",
      error.response?.data || error.message,
    );
    // Beta API may be unavailable — tell the client to show the guided manual flow
    return res.status(200).json({
      success: false,
      fallback: true,
      message: "Automatic editor link unavailable",
    });
  }
};

module.exports = {
  getStorefrontStatus,
  createEditorDeepLink,
  recordStorefrontHeartbeat,
};
