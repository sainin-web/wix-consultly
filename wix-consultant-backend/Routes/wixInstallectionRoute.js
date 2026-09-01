const express = require("express");
const { wix_InstallectionController } = require("../Controller/wixInstallectionController");
const {
  resolveWixInstanceFromAuthHeader,
} = require("../services/wixInstanceFromToken");
const {
  recordStorefrontHeartbeat,
} = require("../Controller/onboardingController");

const wixInstallectionRoute = express.Router();

// Wix calls App URL as GET with ?instance= query param
wixInstallectionRoute.get("/wix/install", wix_InstallectionController);
wixInstallectionRoute.get("/wix/app/install", wix_InstallectionController);

// Widget calls via fetchWithAuth — Authorization is OAuth access token, not install JWT
wixInstallectionRoute.get("/wix/get-instance", async (req, res) => {
  try {
    const result = await resolveWixInstanceFromAuthHeader(
      req.headers.authorization
    );

    if (!result.success) {
      return res.status(result.status || 500).json({
        success: false,
        message: result.error,
      });
    }

    // Storefront heartbeat for the setup wizard — fire-and-forget, never blocks
    recordStorefrontHeartbeat(result.instanceId);

    return res.status(200).json({
      success: true,
      instance: result.instance,
      instanceId: result.instanceId,
      appDefId: result.appDefId,
      siteOwnerId: result.siteOwnerId,
      siteMemberId: result.siteMemberId,
    });
  } catch (err) {
    console.error("GET /wix/get-instance error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve instance",
    });
  }
});

module.exports = { wixInstallectionRoute };
