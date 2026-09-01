const admin = require("../firebase/firebase");

async function sendCallFCM({
    token,
    callerId,
    callerName,
    channelName,
    callType,
    receiverId,
    shop,
    shopId,
    avatar
}) {
    const t = typeof token === "string" ? token.trim() : "";
    if (!t) {
        console.warn(
            "sendCallFCM skipped: missing or empty FCM token (receiver has no device token)",
        );
        return;
    }

    // FCM data payload values must be strings
    const data = {
        type: "CALL",
        callerId: String(callerId ?? ""),
        callerName: String(callerName ?? ""),
        channelName: String(channelName ?? ""),
        callType: String(callType ?? ""),
        receiverId: String(receiverId ?? ""),
        shop: String(shop ?? ""),
        shopId: String(shopId ?? ""),
        avatar: String(avatar ?? ""),
    };

    const message = {
        token: t,
        data,
        android: {
            priority: "high",
        },
        apns: {
            payload: {
                aps: {
                    contentAvailable: true,
                },
            },
        },
    };
    console.log("message____________call", message);

    await admin.messaging().send(message);
}

module.exports = { sendCallFCM };
