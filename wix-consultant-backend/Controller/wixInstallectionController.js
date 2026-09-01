const dotenv = require("dotenv");
const { handleWixInstall } = require("../services/wix.service");
const { resolveWixInstanceFromToken } = require("../services/wixInstanceFromToken");
dotenv.config();





const wix_InstallectionController = async (req, res) => {
  try {
    let instance = req.query.instance || req.body?.instance;
    if (!instance) {
      return res.status(400).send("Missing instance parameter");
    }
    instance = decodeURIComponent(instance);

    const decoded = await resolveWixInstanceFromToken(instance);
    if (!decoded?.instanceId && !decoded?.shopMongoId) {
      console.error("INSTALL ERROR: Could not decode instance");
      return res.status(400).send("Invalid instance");
    }

    const instanceId = decoded.instanceId || decoded.shopMongoId;
    const { appDefId, siteOwnerId, siteMemberId } = decoded || {};

    if (!instanceId) {
      console.error("INSTALL ERROR: No instanceId in payload");
      return res.status(400).send("Invalid instance — no instanceId");
    }

    if (decoded.shopMongoId) {
      return res.status(400).send("Invalid instance — shop id only, reinstall app");
    }

    const wix = await handleWixInstall({
      instanceId: decoded.instanceId,
      appDefId,
      siteOwnerId,
      siteMemberId,
    });
    const dashboardUrl = `${process.env.WIX_DASHBOARD_URL}`;
    if (!dashboardUrl) {
      console.error("INSTALL ERROR: WIX_DASHBOARD_URL is not set in .env");
      return res.status(500).send("Server misconfiguration — dashboard URL not set");
    }

    // const redirectTo = `${dashboardUrl}?instance=${encodeURIComponent(instance)}`;
    // console.log("REDIRECTING TO:", redirectTo);
    // return res.redirect(redirectTo);
    // Wix Developers Center mein Dashboard page ka jo "Relative Path" hai, us par redirect karein
    // Wix Dashboard ke andar redirect karne ka official tareeka ye hai:
    const redirectTo = `https://www.wix.com/_api/v2/setup/finish-installation?token=${req.query.token}&instance=${encodeURIComponent(instance)}`;

    // Agar aap sirf dashboard par bhejna chahte hain (Standard method):
    // redirectTo = `https://www.wix.com/dashboard/${siteOwnerId}/app/${appDefId}/dashboard?instance=${encodeURIComponent(instance)}`;

    return res.redirect(redirectTo);
  } catch (err) {
    console.error("INSTALL ERROR:", err.response?.data || err.message);
    return res.status(500).send("Installation failed. Please try again.");
  }
};

module.exports = { wix_InstallectionController };
