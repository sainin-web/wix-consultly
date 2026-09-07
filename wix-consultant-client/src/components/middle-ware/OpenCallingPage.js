import axios from "axios";
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

/**
 * Ask the server to start a call. The server validates balance, availability
 * and creates the session; it also rings the consultant. The caller then
 * navigates the (already reserved) call tab — see utils/callTab.js. No device
 * checks happen here: the storefront runs inside the Wix iframe, whose
 * permission state says nothing about the top-level call tab.
 *
 * @returns {{ ok:true, callId } | { ok:false, code, message }}
 */
export const openCallPage = async ({ receiverId, type, userId, shop, storeUrl }) => {
  const callerId = userId || getCustomerId();
  const shopKey = storeUrl || shop || getShopId();
  if (!callerId || !receiverId) return { ok: false, code: "login_required", message: "Please log in to start a call." };

  const registered = await ensureSocketRegistered(callerId, { role: SOCKET_ROLE.CUSTOMER });
  if (!registered) return { ok: false, code: "socket", message: "Could not connect for calling. Please refresh and try again." };

  try {
    console.log("[CALL REQUEST] →", { callerId, receiverId, type });
    const { data } = await axios.post(`${BACKEND}/api/call/request`, {
      callerId,
      receiverId,
      callType: type === "video" ? "video" : "voice",
      shopId: shopKey,
    });
    if (!data?.success || !data.call?.callId) return { ok: false, code: "request_failed", message: data?.message || "Call could not be started." };
    return { ok: true, callId: data.call.callId };
  } catch (error) {
    const body = error.response?.data || {};
    console.warn("[CALL REQUEST] rejected", body.code || error.message);
    return { ok: false, code: body.code || "request_failed", message: body.message || "Call could not be started. Please try again." };
  }
};
