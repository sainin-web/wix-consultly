import axios from "axios";
import { checkMicPermission } from "../ConsultantCards/ConsultantCards";
import {
  socket,
  ensureSocketRegistered,
  SOCKET_ROLE,
} from "../Sokect-io/SokectConfig";
import { getCustomerId, getShopId } from "../../utils/wixStorage";

export const checkUserBalance = async ({
  userId,
  consultantId,
  type,
}) => {
  if (!userId || !consultantId) {
    return { requiresLogin: true };
  }
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_BACKEND_HOST}/api/users/shopify/users/checked-balance/${userId}/${consultantId}`,
      {
        params: {
          callType: type,
        },
      },
    );
    return response.data.data;
  } catch (error) {
    return false;
  }
};

/** Build Agora calling page URL from env (no hardcoded ngrok). */
export function buildCallPageUrl({
  callerId,
  receiverId,
  callType,
  uid,
  channelName,
  token,
  appId,
  userId,
  userType,
  shopId,
  returnUrl,
}) {
  const base =
    process.env.REACT_APP_FRONTEND_URL?.replace(/\/$/, "") ||
    window.location.origin;
  const tokenEncoded = encodeURIComponent(token);
  const appIdParam = appId ? `&appId=${encodeURIComponent(appId)}` : "";
  const shopParam = shopId ? `&shopId=${encodeURIComponent(shopId)}` : "";
  const returnParam = returnUrl
    ? `&returnUrl=${encodeURIComponent(returnUrl)}`
    : "";

  return (
    `${base}/video/calling/page` +
    `?callerId=${encodeURIComponent(callerId)}` +
    `&receiverId=${encodeURIComponent(receiverId)}` +
    `&callType=${encodeURIComponent(callType || "voice")}` +
    `&uid=${encodeURIComponent(uid)}` +
    `&channelName=${encodeURIComponent(channelName)}` +
    `&token=${tokenEncoded}` +
    appIdParam +
    `&userId=${encodeURIComponent(userId)}` +
    `&userType=${encodeURIComponent(userType)}` +
    shopParam +
    returnParam
  );
}

export function navigateToCallPage(callUrl) {
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = callUrl;
    } else {
      window.open(callUrl, "_blank", "noopener,noreferrer");
    }
  } catch {
    window.location.href = callUrl;
  }
}

export const openCallPage = async ({
  receiverId,
  type,
  userId,
  shop,
  storeUrl,
}) => {
  const callerId = userId || getCustomerId();
  const shopKey = storeUrl || shop || getShopId();

  if (!callerId || !receiverId) {
    alert("You need to login first to make a call.");
    return;
  }

  try {
    const balance = await checkUserBalance({
      userId: callerId,
      consultantId: receiverId,
      type,
    });
    if (!balance) {
      alert("You have insufficient balance");
      return;
    }
    if (balance?.requiresLogin) {
      alert("You need to login first to make a call.");
      return;
    }

    const micState = await checkMicPermission();
    if (micState === "denied") {
      alert("Please grant microphone permission");
      return;
    }

    const ok = await ensureSocketRegistered(callerId, {
      role: SOCKET_ROLE.CUSTOMER,
    });
    if (!ok) {
      alert("Could not connect for calling. Please refresh and try again.");
      return;
    }

    const channelName = `channel-${String(callerId).slice(-6)}-${String(receiverId).slice(-6)}`;
    const uid = Math.floor(Math.random() * 1000000);
    const res = await axios.post(
      `${process.env.REACT_APP_BACKEND_HOST}/api/call/generate-token`,
      {
        channelName,
        uid,
        callerId,
        receiverId,
      },
      { headers: { "Content-Type": "application/json" } },
    );

    const data = res.data;
    if (!data?.token) {
      throw new Error("Token missing from API");
    }

    socket.emit("call-user", {
      callerId,
      receiverId,
      channelName,
      callType: type || "voice",
      shop: shopKey,
    });

    const returnUrl =
      window.location.href ||
      `${window.location.origin}/consultant/card`;

    const callUrl = buildCallPageUrl({
      callerId,
      receiverId,
      callType: type || "voice",
      uid,
      channelName,
      token: data.token,
      appId: data.appId,
      userId: callerId,
      userType: "client",
      shopId: shopKey,
      returnUrl,
    });

    navigateToCallPage(callUrl);
  } catch (error) {
    console.error("[call] openCallPage failed:", error?.message || error);
    alert("Call failed. Please try again.");
  }
};
