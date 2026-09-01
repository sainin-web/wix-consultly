import { getSessionToken } from "@shopify/app-bridge-utils";

export const getAppBridgeToken = async (app) => {
  if (!app) return null;
  try {
    return await getSessionToken(app);
  } catch {
    return null;
  }
};
