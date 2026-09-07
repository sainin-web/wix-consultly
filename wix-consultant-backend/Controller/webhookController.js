const jwt = require("jsonwebtoken");
const { shopModel } = require("../Modal/shopify");
const { handleWixInstall } = require("../services/wix.service");
const axios = require("axios");
const { User } = require("../Modal/userSchema"); // your user model
const { verifyWixWebhook, hasPublicKey } = require("../services/wixWebhookVerify");
const voucherPurchase = require("../services/voucherPurchase");

const ECOM_ORDER_EVENTS = new Set([
  "wix.ecom.v1.order_payment_status_updated",
  "wix.ecom.v1.order_approved",
  "wix.ecom.v1.order_updated",
]);

/**
 * eCommerce order events (Payment Status Updated / Order Approved). Only a
 * signature-verified JWT is accepted; the order is then re-fetched from Wix and
 * the purchase finalized exactly once (services/voucherPurchase.js).
 */
async function handleEcomEvent(raw) {
  console.log("[WIX WEBHOOK] Webhook received (ecom candidate)");
  const v = verifyWixWebhook(raw);
  if (!v.verified) {
    console.error("[WIX WEBHOOK] REJECTED — not verified:", v.reason, hasPublicKey() ? "" : "(set WIX_WEBHOOK_PUBLIC_KEY)");
    return { handled: true, rejected: v.reason };
  }
  const { eventType, instanceId } = v.envelope || {};
  const ev = v.event || {};
  if (!ECOM_ORDER_EVENTS.has(eventType) && ev.entityFqdn !== "wix.ecom.v1.order") return { handled: false };
  console.log("[WIX WEBHOOK] Event verified", { eventType, instanceId, eventId: ev.id, slug: ev.slug, orderId: ev.entityId });
  const orderFromEvent = ev.actionEvent?.body?.order || ev.currentEntity || ev.entity || null;
  const orderId = ev.entityId || orderFromEvent?.id || null;
  const r = await voucherPurchase.handleOrderEvent({ eventId: ev.id, eventType, instanceId, orderId, orderFromEvent });
  console.log("[WIX WEBHOOK] ecom event result", r);
  return { handled: true, result: r };
}

function rawBodyString(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf-8");
  if (req.body?.type === "Buffer" && Array.isArray(req.body.data)) return Buffer.from(req.body.data).toString("utf-8");
  if (typeof req.body === "string") return req.body;
  return null;
}

const wixWebhookController = async (req, res) => {
  // ✅ Always respond 200 first — Wix retries if no response
  res.status(200).json({ success: true });

  try {
    let raw = rawBodyString(req);

    // eCommerce order events are money-moving: verified path, then stop.
    if (raw) {
      try {
        const ecom = await handleEcomEvent(raw);
        if (ecom.handled) return;
      } catch (e) {
        console.error("[WIX WEBHOOK] ecom handler error:", e.message);
        return;
      }
    }

    // ── 2. Decode ────────────────────────────────────────────────────────
    let decoded = null;
    if (raw) {
      console.log("RAW STRING:", raw.substring(0, 150));
      decoded = jwt.decode(raw); // try JWT first
      if (!decoded) {
        try {
          decoded = JSON.parse(raw);
        } catch (_) {} // fallback JSON
      }
    } else if (typeof req.body === "object" && req.body !== null) {
      decoded = req.body; // already parsed by express.json
    }

    if (!decoded) {
      console.log("Could not decode body — ignoring");
      return;
    }

    console.log("DECODED TOP-LEVEL keys:", Object.keys(decoded));

    let payload = {};

    if (decoded.data && typeof decoded.data === "string") {
      try {
        payload = JSON.parse(decoded.data);
      } catch (_) {
        console.log("Failed to parse decoded.data");
      }
    } else if (decoded.instance && typeof decoded.instance === "string") {
      const parts = decoded.instance.split(".");
      try {
        payload = JSON.parse(
          Buffer.from(parts[parts.length - 1], "base64").toString("utf-8"),
        );
      } catch (_) {
        console.log("Failed to decode instance base64");
      }
    } else {
      payload = decoded;
    }

    console.log("PAYLOAD:", JSON.stringify(payload)?.substring(0, 300));

    const instanceId = payload.instanceId;
    const eventType = payload.eventType;
    const appDefId = payload.appDefId || "";
    const siteOwnerId = payload.siteOwnerId || "";
    const siteMemberId = payload.siteMemberId || "";

    let eventData = {};
    if (payload.data) {
      try {
        eventData =
          typeof payload.data === "string"
            ? JSON.parse(payload.data)
            : payload.data;
      } catch (_) {}
    }

    console.log("eventType :", eventType);
    console.log("instanceId:", instanceId);

    if (!instanceId) {
      console.log("No instanceId — ignoring");
      return;
    }

    switch (eventType) {
      case "wix.app_management.apps.app_instance.v1.app_instance_installed":
      case "AppInstalled": {
        console.log("📦 App Installed:", instanceId);
        // await handleWixInstall({
        //   instanceId,
        //   appDefId: eventData.appId || appDefId,
        //   siteOwnerId,
        //   siteMemberId,
        // });
        console.log("✅ Install handled via webhook");
        break;
      }

      case "wix.app_management.apps.app_instance.v1.app_instance_removed":
      case "AppRemoved": {
        console.log("🗑️  App Removed:", instanceId);
        await shopModel.findOneAndDelete({ instanceId });
        console.log("❌ Deleted from DB:", instanceId);
        break;
      }

      // Install ping — no eventType, just instance data
      case undefined:
      case null: {
        console.log("📦 Install ping (no eventType):", instanceId);
        await handleWixInstall({
          instanceId,
          appDefId,
          siteOwnerId,
          siteMemberId,
        });
        console.log("✅ Install handled via ping");
        break;
      }

      default:
        console.log("ℹ Other event, ignoring:", eventType);
    }
  } catch (err) {
    console.error("WEBHOOK ERROR:", err.response?.data || err.message);
  }
};



/*
  ============================
  WIX ORDER WEBHOOK
  POST /webhook/wix-order
  ============================
*/
const wixOrderWebhook = async (req, res) => {

  res.status(200).json({ received: true });

  try {
    console.log("Wix Webhook received");
    console.log("Raw body:", req.body);

    /*
      ============================
      STEP 2: DECODE JWT PAYLOAD
      Wix sends data as JWT
      ============================
    */
    let eventData;

    try {
      // JWT decode (without verify for now — add public key verification later)
      const decoded = jwt.decode(req.body.data || req.body);
      eventData = decoded;
      console.log("Decoded event:", JSON.stringify(eventData, null, 2));
    } catch (jwtError) {
      console.log("JWT decode failed, trying raw body:", jwtError.message);
      eventData =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    /*
      ============================
      STEP 3: CHECK EVENT TYPE
      Only handle "created" orders
      ============================
    */
    const eventSlug = eventData?.slug || eventData?.data?.slug;
    const orderId = eventData?.entityId || eventData?.data?.entityId;

    console.log("Event slug:", eventSlug);
    console.log("Order ID:", orderId);

    if (!orderId) {
      console.log("No orderId found in webhook payload");
      return;
    }

    /*
      ============================
      STEP 4: GET FULL ORDER FROM WIX
      GET /ecom/v1/orders/{orderId}
      Need admin accessToken for this
      ============================
    */

    // Find admin who owns this order
    // We'll search all admins for matching product
    const allAdmins = await shopModel.find({ accessToken: { $exists: true } });

    let matchedAdmin = null;
    let matchedVoucher = null;
    let orderDetails = null;

    for (const admin of allAdmins) {
      try {
        const orderRes = await axios.get(
          `https://www.wixapis.com/ecom/v1/orders/${orderId}`,
          {
            headers: {
              Authorization: admin.accessToken,
              "Content-Type": "application/json",
            },
          },
        );

        orderDetails = orderRes.data.order;
        console.log("Order Details:", JSON.stringify(orderDetails, null, 2));

        // Check if this order's product belongs to this admin's vouchers
        const lineItems = orderDetails.lineItems || [];

        for (const item of lineItems) {
          const catalogItemId = item.catalogReference?.catalogItemId;

          if (catalogItemId) {
            const voucher = admin.vouchers.find(
              (v) => v.wixProductId === catalogItemId,
            );

            if (voucher) {
              matchedAdmin = admin;
              matchedVoucher = voucher;
              console.log("Matched voucher:", voucher);
              break;
            }
          }
        }

        if (matchedAdmin) break;
      } catch (err) {
        // This admin doesn't have access to this order — try next
        continue;
      }
    }

    if (!matchedAdmin || !matchedVoucher) {
      console.log("No matching voucher found for this order");
      return;
    }

    /*
      ============================
      STEP 5: CHECK PAYMENT STATUS
      Only give coins if PAID
      ============================
    */
    const paymentStatus = orderDetails.paymentStatus;
    console.log("Payment Status:", paymentStatus);

    // PAID / FULLY_PAID = coins dena hai
    if (paymentStatus !== "PAID" && paymentStatus !== "FULLY_PAID") {
      console.log("Order not paid yet, skipping coins assignment");
      return;
    }

    /*
      ============================
      STEP 6: FIND BUYER
      Get buyer email from order
      Match with your user DB
      ============================
    */
    const buyerEmail = orderDetails.buyerInfo?.email;
    const buyerPhone = orderDetails.billingInfo?.contactDetails?.phone;

    console.log("Buyer Email:", buyerEmail);
    console.log("Buyer Phone:", buyerPhone);

    // Find user in your DB by email or phone
    const user = await User.findOne({
      $or: [{ email: buyerEmail }, { phone: buyerPhone }],
    });

    if (!user) {
      console.log("User not found in DB for email:", buyerEmail);
      // Still mark voucher — coins will be given when user registers
      // OR create pending coins record
    }

    /*
      ============================
      STEP 7: GIVE COINS TO USER
      ============================
    */
    const totalCoinsToGive =
      Number(matchedVoucher.totalCoin) + Number(matchedVoucher.extraCoin);

    console.log(`Giving ${totalCoinsToGive} coins to user`);

    if (user) {
      user.coins = (user.coins || 0) + totalCoinsToGive;
      await user.save();
      console.log(`✅ ${totalCoinsToGive} coins added to user: ${buyerEmail}`);
    }

    /*
      ============================
      STEP 8: SAVE ORDER IN VOUCHER
      Mark voucher as purchased
      ============================
    */
    const voucherIndex = matchedAdmin.vouchers.findIndex(
      (v) => v.wixProductId === matchedVoucher.wixProductId,
    );

    if (voucherIndex !== -1) {
      // Add purchase record to voucher
      if (!matchedAdmin.vouchers[voucherIndex].purchases) {
        matchedAdmin.vouchers[voucherIndex].purchases = [];
      }

      matchedAdmin.vouchers[voucherIndex].purchases.push({
        orderId,
        buyerEmail,
        buyerPhone,
        coinsGiven: totalCoinsToGive,
        paymentStatus,
        purchasedAt: new Date(),
      });

      matchedAdmin.markModified("vouchers");
      await matchedAdmin.save();
      console.log("✅ Purchase recorded in voucher");
    }

    console.log("✅ Webhook processed successfully");
  } catch (error) {
    console.log("Webhook processing error:", error.message);
    // Don't throw — 200 already sent
  }
};


module.exports = { wixWebhookController, wixOrderWebhook };
