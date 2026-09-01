// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js",
);

// Replace these with same config as src/firebase.js
firebase.initializeApp({
  apiKey: "AIzaSyCi61pDIUtbi7pvnxfFRNIpi8RjTHpFNxs",
  authDomain: "consultant-app-24ceb.firebaseapp.com",
  projectId: "consultant-app-24ceb",
  storageBucket: "consultant-app-24ceb.firebasestorage.app",
  messagingSenderId: "465295888006",
  appId: "1:465295888006:web:ae07e6f6667e0e6f838b07",
  measurementId: "G-9TD9Q1Q0PJ",
});

const defaultBadge =
  "https://upload.wikimedia.org/wikipedia/commons/7/7e/Notification_badge_icon.png";
const messaging = firebase.messaging();

// Make rounded image + return BASE64
async function makeRoundedImageBase64(url, size = 128) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(bitmap, 0, 0, size, size);

    const finalBlob = await canvas.convertToBlob({ type: "image/png" });

    // Convert blob → base64
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // base64
      reader.readAsDataURL(finalBlob);
    });
  } catch (err) {
    console.error("Rounded failed:", err);
    return url; // fallback
  }
}

// messaging.onBackgroundMessage(async function (payload) {
//   const data = payload.data || {};
//   console.log("data", data);
//   console.log("payload", payload);
//   const title = payload.notification?.title || "New message_______";
//   const body = data.body || "No text";
//   const shop_Domain = data.shop_domain || "No shop domain";

//   const roundedBase64 = await makeRoundedImageBase64(
//     data.avatar ||
//       "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128",
//     128,
//   );

//   self.registration.showNotification(title, {
//     body,
//     icon: roundedBase64,
//     badge: defaultBadge,
//     data: {
//       ...data,
//       url: `https://${shop_Domain}/apps/consultant-theme/consultant-dashboard`,
//     },
//   });
// });

// self.addEventListener("notificationclick", function (event) {
//   event.notification.close();

//   const urlToOpen =
//     event.notification.data?.url ||
//     `https://${shop_Domain}/apps/consultant-theme/consultant-dashboard`;

//   event.waitUntil(clients.openWindow(urlToOpen));
// });

// last usesage code

// messaging.onBackgroundMessage(async function (payload) {
//   const data = payload.data || {};
//   console.log("data", data);
//   console.log("payload", payload);

//   const title = data.title || "New message";
//   const body = data.body || "No text";
//   const shop_Domain = data.shopDomain || "";

//   const roundedBase64 = await makeRoundedImageBase64(
//     data.avatar ||
//       "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128",
//     128,
//   );

//   const finalUrl = shop_Domain
//     ? `https://${shop_Domain}/apps/consultant-theme`
//     : "/";

//   self.registration.showNotification(title, {
//     body,
//     icon: roundedBase64,
//     badge: defaultBadge,
//     data: {
//       url: finalUrl, // ✅ only store final url
//     },
//   });
// });

messaging.onBackgroundMessage(async function (payload) {
  const data = payload.data || {};

  let title = "New Notification";
  let body = "";
  let finalUrl = "/";

  if (data.type === "CALL") {
    title = "Incoming Call";
    body = `${data.callerName} is calling you`;

    finalUrl =
      `https://test-consultation-app.zend-apps.com/push-call-incoming` +
      `?callerId=${data.callerId}` +
      `&channelName=${data.channelName}` +
      `&callType=${data.callType}` +
      `&shop=${data.shop ||"rohit-1234567890.myshopify.com`"}`;
  } else {
    title = data.senderName || "New Message";
    body = data.message || "You received a new message";
    finalUrl = `https://${data.shop}/apps/consultant-theme/consultant-dashboard`;
  }

  self.registration.showNotification(title, {
    body,
    icon: data.avatar || "/default-avatar.png",
    data: { url: finalUrl },
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(clients.openWindow(urlToOpen));
});
console.log("🔥 SW VERSION 6 - Edge Test");
