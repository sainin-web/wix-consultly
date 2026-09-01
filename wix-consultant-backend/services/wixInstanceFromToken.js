const axios = require("axios");
const { decodeInstance } = require("../MiddleWare/decodeInstance");

/**
 * Resolves Wix app instance from install JWT / dashboard ?instance= token / UUID.
 * Falls back to Wix token-info when local decode does not yield instanceId.
 */
async function resolveWixInstanceFromToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return null;

  const decoded = decodeInstance(raw);
  if (decoded?.instanceId) {
    return {
      instanceId: decoded.instanceId,
      appDefId: decoded.appDefId,
      siteOwnerId: decoded.siteOwnerId,
      siteMemberId: decoded.siteMemberId,
    };
  }
  if (decoded?.shopMongoId) {
    return { shopMongoId: decoded.shopMongoId };
  }

  try {
    const { data } = await axios.post(
      "https://www.wixapis.com/oauth2/token-info",
      { token: raw },
      { headers: { "Content-Type": "application/json" } },
    );

    if (data?.instanceId) {
      return {
        instanceId: data.instanceId,
        appDefId: data.appDefId,
        siteOwnerId: data.siteOwnerId,
        siteMemberId: data.siteMemberId,
      };
    }
  } catch (err) {
    console.warn(
      "resolveWixInstanceFromToken token-info failed:",
      err.response?.data || err.message,
    );
  }

  return null;
}

/**
 * Resolves app instance from Authorization header.
 * - Install JWT (?instance= sig.data) → decode directly
 * - fetchWithAuth OAuth token → Wix token-info API
 */
async function resolveWixInstanceFromAuthHeader(authHeader) {
  const bearer = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) {
    return { error: "Missing authorization", status: 401 };
  }
  console.log("bearer", bearer);
  const fromInstallJwt = decodeInstance(bearer);
  if (fromInstallJwt?.instanceId) {
    return {
      success: true,
      instance: bearer,
      instanceId: fromInstallJwt.instanceId,
      appDefId: fromInstallJwt.appDefId,
      siteOwnerId: fromInstallJwt.siteOwnerId,
      siteMemberId: fromInstallJwt.siteMemberId,
    };
  }

  try {
    const { data } = await axios.post(
      "https://www.wixapis.com/oauth2/token-info",
      { token: bearer },
      { headers: { "Content-Type": "application/json" } },
    );

    const instanceId = data.instanceId;
    if (!instanceId) {
      return { error: "No instanceId in token", status: 401 };
    }

    return {
      success: true,
      // Storefront iframe uses ?instance= — UUID is enough after decodeInstance update
      instance: instanceId,
      instanceId,
      appDefId: data.appDefId,
      siteOwnerId: data.siteOwnerId,
      siteMemberId: data.siteMemberId,
    };
  } catch (err) {
    console.error("Wix token-info error:", err.response?.data || err.message);
    return { error: "Invalid access token", status: 401 };
  }
}

module.exports = {
  resolveWixInstanceFromAuthHeader,
  resolveWixInstanceFromToken,
};
