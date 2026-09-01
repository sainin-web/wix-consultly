import { getAppBridgeToken } from "./getAppBridgeToken";

/**
 * Wix dashboard admin APIs use JWT from install check (wix_access_token).
 * Legacy Shopify App Bridge token is used when `app` is provided.
 */
export async function getWixAdminToken(app) {
  if (app) {
    const bridgeToken = await getAppBridgeToken(app);
    if (bridgeToken) return bridgeToken;
  }
  return (
    localStorage.getItem("wix_access_token") ||
    localStorage.getItem("appToken") ||
    ""
  );
}
