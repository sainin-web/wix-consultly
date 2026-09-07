import axios from "axios";
import { checkMicPermission } from "../ConsultantCards/ConsultantCards";
import { ensureSocketRegistered, SOCKET_ROLE } from "../Sokect-io/SokectConfig";
import { getCustomerId, getShopId } from "../../utils/wixStorage";

const BACKEND = process.env.REACT_APP_BACKEND_HOST;

/** Kept for the chat flow (balance pre-check before a chat request). */
export const checkUserBalance = async ({ userId, consultantId, type }) => {
  if (!userId || !consultantId) return { requiresLogin: true };
  try {
    const response = await axios.get(
      `${BACKEND}/api/users/shopify/users/checked-balance/${userId}/${consultantId}`,
      { params: { callType: type } },
    );
    return response.data.data;
  } catch (error) {
    return false;
  }
};

/** In-app call page URL (stays inside the Wix iframe — never window.top). */
export function callPagePath(callId, returnTo) {
  const instance = new URLSearchParams(window.location.search).get("instance") || localStorage.getItem("wix_instance") || "";
  const q = new URLSearchParams();
  q.set("callId", callId);
  if (instance) q.set("instance", instance);
  if (returnTo) q.set("return", returnTo);
  return `/video/calling/page?${q.toString()}`;
}

/**
 * Ask the server to start a call. The server validates balance, availability
 * and creates the session; it also rings the consultant.
 *
 * @returns {{ ok:true, callId, path } | { ok:false, code, message }}
 */
export const openCallPage = async ({ receiverId, type, userId, shop, storeUrl, returnTo }) => {
  const callerId = userId || getCustomerId();
  const shopKey = storeUrl || shop || getShopId();
  if (!callerId || !receiverId) return { ok: false, code: "login_required", message: "Please log in to start a call." };

  const micState = await checkMicPermission();
  if (micState === "denied") {
    return { ok: false, code: "permission_denied", message: "Microphone access is required. Please allow it in your browser settings." };
  }

  const registered = await ensureSocketRegistered(callerId, { role: SOCKET_ROLE.CUSTOMER });
  if (!registered) return { ok: false, code: "socket", message: "Could not connect for calling. Please refresh and try again." };

  try {
    console.log("[CALL] Request", { callerId, receiverId, type });
    const { data } = await axios.post(`${BACKEND}/api/call/request`, {
      callerId,
      receiverId,
      callType: type === "video" ? "video" : "voice",
      shopId: shopKey,
    });
    if (!data?.success || !data.call?.callId) return { ok: false, code: "request_failed", message: data?.message || "Call could not be started." };
    return { ok: true, callId: data.call.callId, path: callPagePath(data.call.callId, returnTo || window.location.pathname) };
  } catch (error) {
    const body = error.response?.data || {};
    console.warn("[CALL] request rejected", body.code || error.message);
    return { ok: false, code: body.code || "request_failed", message: body.message || "Call could not be started. Please try again." };
  }
};
