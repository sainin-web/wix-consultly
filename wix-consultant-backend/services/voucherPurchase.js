const mongoose = require("mongoose");
const crypto = require("crypto");
const { VoucherPurchase } = require("../Modal/voucherPurchase");
const { shopModel } = require("../Modal/shopify");
const { User } = require("../Modal/userSchema");
const { WalletHistory } = require("../Modal/walletHistory");
const wixEcom = require("./wixEcom");

/*
 * Voucher purchase lifecycle — the server is the only authority.
 *
 *   Buy now → createPurchase(): user from the verified session, voucher from
 *   the user's own shop (instance), price/credits from the DB, PENDING row
 *   with a snapshot, Wix checkout created and mapped by wixCheckoutId.
 *
 *   Wix webhook (signed) → handleOrderEvent(): order re-fetched from Wix,
 *   paymentStatus must be PAID, purchase found by checkoutId, then
 *   finalizePaid(): atomic claim (PENDING→PROCESSING, creditsAdded:false) so
 *   exactly one delivery wins, then ONE Mongo transaction: wallet += credits,
 *   WalletHistory row, purchase PAID. Any failure rolls back and releases the
 *   claim so the next retry can finalize.
 */
// States a PAID webhook may still finalize: money was taken, so a purchase the
// user abandoned (CANCELLED) or that timed out (EXPIRED) is still honoured.
const CLAIMABLE = ["PENDING", "EXPIRED", "CANCELLED"];
const PENDING_TTL_MS = (Number(process.env.VOUCHER_PURCHASE_TTL_HOURS) || 24) * 3600 * 1000;
const PROCESSING_STALE_MS = 2 * 60 * 1000;
const PAID_STATUSES = new Set(["PAID"]);
const FAILED_STATUSES = new Set(["CANCELED", "DECLINED"]);

const newPurchaseId = () => `VP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
const num = (v) => (v && typeof v === "object" && v.$numberDecimal ? Number(v.$numberDecimal) : Number(v));

function publicView(p) {
  if (!p) return null;
  return {
    purchaseId: p.purchaseId,
    status: p.status,
    voucher: {
      name: p.voucherSnapshot?.name,
      credits: p.credits,
      price: p.amount,
      currency: p.currency,
    },
    amount: p.amount,
    currency: p.currency,
    credits: p.credits,
    creditsAdded: Boolean(p.creditsAdded),
    checkoutUrl: ["PENDING"].includes(p.status) ? p.wixCheckoutUrl : null,
    wixOrderNumber: p.wixOrderNumber || null,
    wixOrderId: p.wixOrderId || null,
    paidAt: p.paidAt || null,
    failedAt: p.failedAt || null,
    cancelledAt: p.cancelledAt || null,
    createdAt: p.createdAt,
  };
}

/* ── shop / voucher resolution (instance-scoped) ─────────────── */

async function resolveShopForUser(user, claims) {
  const instanceId = claims?.instanceId || user.instanceId || "";
  let shop = null;
  if (instanceId) shop = await shopModel.findOne({ instanceId });
  if (!shop && user.shop_id && mongoose.Types.ObjectId.isValid(String(user.shop_id))) shop = await shopModel.findById(user.shop_id);
  return shop;
}

/* ── 1. Buy now ──────────────────────────────────────────────── */

async function createPurchase({ user, claims, voucherId }) {
  console.log("[VOUCHER PURCHASE] Purchase request received", { userId: String(user._id), voucherId });
  if (!mongoose.Types.ObjectId.isValid(String(voucherId || ""))) return { ok: false, status: 400, code: "invalid_voucher", message: "Invalid voucher." };

  const shop = await resolveShopForUser(user, claims);
  if (!shop) return { ok: false, status: 400, code: "no_shop", message: "Your account is not linked to this site. Please sign in again." };
  console.log("[VOUCHER PURCHASE] Authenticated user:", String(user._id), "instance:", shop.instanceId);

  const voucher = shop.vouchers.id(voucherId);
  if (!voucher) return { ok: false, status: 404, code: "voucher_not_found", message: "This credit pack is not available on this site." };
  if (voucher.active === false) return { ok: false, status: 409, code: "voucher_inactive", message: "This credit pack is no longer available." };

  const price = num(voucher.price);
  const totalCoin = num(voucher.totalCoin) || 0;
  const extraCoin = num(voucher.extraCoin) || 0;
  const credits = totalCoin + extraCoin;
  if (!Number.isFinite(price) || price <= 0) return { ok: false, status: 409, code: "voucher_invalid_price", message: "This credit pack has an invalid price." };
  if (!Number.isFinite(credits) || credits <= 0) return { ok: false, status: 409, code: "voucher_invalid_credits", message: "This credit pack has invalid credits." };
  if (!voucher.wixProductId) return { ok: false, status: 409, code: "voucher_not_sellable", message: "This credit pack is not connected to the store yet." };
  console.log("[VOUCHER PURCHASE] Voucher found:", String(voucher._id), { price, credits });

  const currency = shop.currencyCode || shop.currency || "";
  const purchase = await VoucherPurchase.create({
    purchaseId: newPurchaseId(),
    userId: user._id,
    shopId: shop._id,
    wixInstanceId: shop.instanceId,
    voucherId: voucher._id,
    voucherSnapshot: {
      name: voucher.name || `${totalCoin} credits pack`,
      description: extraCoin ? `${totalCoin} credits + ${extraCoin} bonus` : `${totalCoin} credits`,
      price, currency, credits, totalCoin, extraCoin,
      wixProductId: voucher.wixProductId, catalogVersion: voucher.catalogVersion || "V1",
    },
    amount: price,
    currency,
    credits,
    status: "PENDING",
  });
  console.log("[VOUCHER PURCHASE] Pending purchase created:", purchase.purchaseId);

  try {
    const { checkoutId, purchaseFlowId, checkoutUrl } = await wixEcom.createVoucherCheckout({ instanceId: shop.instanceId, voucher: purchase.voucherSnapshot });
    purchase.wixCheckoutId = checkoutId;
    purchase.wixPurchaseFlowId = purchaseFlowId;
    purchase.wixCheckoutUrl = checkoutUrl;
    await purchase.save();
    console.log("[VOUCHER PURCHASE] Mapped", { purchaseId: purchase.purchaseId, checkoutId });
    return { ok: true, purchase };
  } catch (e) {
    purchase.status = "FAILED";
    purchase.failedAt = new Date();
    purchase.lastError = `checkout:${e.detail || e.message}`;
    await purchase.save();
    console.error("[VOUCHER PURCHASE] Checkout creation failed", { purchaseId: purchase.purchaseId, error: e.detail || e.message });
    const permission = e.status === 403;
    return { ok: false, status: 502, code: permission ? "wix_permission" : "checkout_failed", message: permission ? "The store is not configured for checkout yet. Please contact the site owner." : "We could not start the checkout. Please try again in a moment." };
  }
}

/* ── 2. Webhook → order → finalize ───────────────────────────── */

/**
 * @param {object} p  { eventId, eventType, instanceId, orderId, orderFromEvent }
 */
async function handleOrderEvent({ eventId, eventType, instanceId, orderId, orderFromEvent }) {
  if (!orderId || !instanceId) return { ok: false, code: "missing_ids" };

  // Cheap idempotency before any network call.
  if (eventId) {
    const seen = await VoucherPurchase.findOne({ webhookEventIds: eventId }).select("purchaseId status");
    if (seen) { console.log("[WIX WEBHOOK] Duplicate event ignored", { eventId, purchaseId: seen.purchaseId }); return { ok: true, duplicate: true }; }
  }

  // 1. The instance must be a REAL installed Consultly site. Wix dashboard
  //    "Trigger Test" events carry an instanceId that is not installed here:
  //    ignore them (200 to stop retries) and never touch tokens or wallets.
  const shop = await wixEcom.findInstalledShop(instanceId);
  if (!shop) {
    console.log("[WIX WEBHOOK] Unknown/test instance - ignored", { instanceId, orderId, eventType });
    return { ok: true, ignored: true, reason: "unknown_instance" };
  }
  console.log("[WIX WEBHOOK] Instance found", { instanceId, shopId: String(shop._id) });

  // 2. A Consultly purchase must already map to this order/checkout. The signed
  //    payload's checkoutId is enough to look it up; if nothing matches this is
  //    not a voucher order (or a test order) → ignore without calling Wix.
  const hintedCheckoutId = orderFromEvent?.checkoutId || null;
  const preMatch = await VoucherPurchase.findOne({ shopId: shop._id, $or: [{ wixOrderId: orderId }, ...(hintedCheckoutId ? [{ wixCheckoutId: hintedCheckoutId }] : [])] }).select("purchaseId status");
  if (!preMatch) {
    console.log("[VOUCHER PAYMENT] No purchase maps to this order on this site - ignored", { instanceId, orderId, checkoutId: hintedCheckoutId });
    return { ok: true, ignored: true, reason: "no_purchase" };
  }
  console.log("[VOUCHER PAYMENT] Purchase found", { purchaseId: preMatch.purchaseId, status: preMatch.status });

  // 3. Authoritative order: re-fetched from Wix with the INSTALLED site's token.
  let order = null;
  try {
    order = await wixEcom.getOrder({ instanceId, orderId });
    console.log("[VOUCHER PAYMENT] Order verified with Wix", { orderId, paymentStatus: order?.paymentStatus, checkoutId: order?.checkoutId });
  } catch (e) {
    const status = e.response?.status;
    if (status === 403 && orderFromEvent) {
      // The webhook itself is Wix-signed; use its order only when the app lacks Read Orders.
      console.warn("[VOUCHER PAYMENT] Get Order forbidden (missing Read Orders permission) → using the signed webhook order");
      order = orderFromEvent;
    } else {
      console.error("[VOUCHER PAYMENT] Get Order failed", { orderId, error: e.response?.data?.message || e.message });
      return { ok: false, code: "order_fetch_failed" };
    }
  }
  if (!order) return { ok: false, code: "order_not_found" };

  const checkoutId = order.checkoutId || null;
  const purchase = await VoucherPurchase.findOne({ shopId: shop._id, $or: [{ wixOrderId: orderId }, ...(checkoutId ? [{ wixCheckoutId: checkoutId }] : [])] });
  if (!purchase) { console.log("[VOUCHER PAYMENT] Verified order does not map to a purchase on this site - ignored", { orderId, checkoutId }); return { ok: true, ignored: true }; }
  if (purchase.wixInstanceId !== instanceId) {
    console.error("[VOUCHER PAYMENT] Instance mismatch — refusing", { purchaseId: purchase.purchaseId, expected: purchase.wixInstanceId, got: instanceId });
    return { ok: false, code: "instance_mismatch" };
  }
  const paymentStatus = String(order.paymentStatus || "").toUpperCase();
  console.log("[VOUCHER PAYMENT] Payment verified", { purchaseId: purchase.purchaseId, paymentStatus, orderId: order.id || orderId, total: order.priceSummary?.total?.amount });

  // Line item must be the product we sold (defence in depth on top of checkoutId mapping).
  const items = order.lineItems || [];
  const productOk = items.some((li) => String(li.catalogReference?.catalogItemId || "") === String(purchase.voucherSnapshot?.wixProductId || ""));
  if (!productOk) {
    console.error("[VOUCHER PAYMENT] Order line items do not match the voucher product — refusing", { purchaseId: purchase.purchaseId });
    await VoucherPurchase.updateOne({ _id: purchase._id }, { $addToSet: { webhookEventIds: eventId }, $set: { lastError: "product_mismatch" } });
    return { ok: false, code: "product_mismatch" };
  }

  const total = Number(order.priceSummary?.total?.amount);
  const orderMeta = { wixOrderId: String(order.id || orderId), wixOrderNumber: Number(order.number) || undefined, wixPaymentStatus: paymentStatus, amountPaid: Number.isFinite(total) ? total : undefined, amountMismatch: Number.isFinite(total) && total + 0.005 < Number(purchase.amount) };

  if (PAID_STATUSES.has(paymentStatus)) return finalizePaid({ purchase, eventId, orderMeta });

  if (FAILED_STATUSES.has(paymentStatus)) {
    const r = await VoucherPurchase.updateOne(
      { _id: purchase._id, status: { $in: CLAIMABLE }, creditsAdded: false },
      { $set: { ...orderMeta, status: "FAILED", failedAt: new Date() }, $addToSet: { webhookEventIds: eventId } },
    );
    console.log("[VOUCHER PAYMENT] Payment failed/cancelled → FAILED", { purchaseId: purchase.purchaseId, changed: r.modifiedCount });
    return { ok: true, failed: true };
  }

  // NOT_PAID / PENDING / PARTIALLY_PAID / refunds: record, never credit.
  await VoucherPurchase.updateOne({ _id: purchase._id }, { $set: orderMeta, $addToSet: { webhookEventIds: eventId } });
  console.log("[VOUCHER PAYMENT] Not a paid state → no credits", { purchaseId: purchase.purchaseId, paymentStatus });
  return { ok: true, noop: true };
}

/**
 * Exactly-once credit. Claim first (only one caller can move PENDING/EXPIRED →
 * PROCESSING while creditsAdded is false), then commit everything in one
 * transaction. On any error the claim is released back to PENDING.
 */
async function finalizePaid({ purchase, eventId, orderMeta }) {
  const claimed = await VoucherPurchase.findOneAndUpdate(
    { _id: purchase._id, status: { $in: CLAIMABLE }, creditsAdded: false },
    { $set: { status: "PROCESSING", processingAt: new Date(), ...orderMeta } },
    { new: true },
  );
  if (!claimed) {
    const cur = await VoucherPurchase.findById(purchase._id).select("status creditsAdded purchaseId");
    console.log("[VOUCHER PAYMENT] Already claimed/finalized — nothing to do", { purchaseId: cur?.purchaseId, status: cur?.status, creditsAdded: cur?.creditsAdded });
    if (eventId) await VoucherPurchase.updateOne({ _id: purchase._id }, { $addToSet: { webhookEventIds: eventId } });
    return { ok: true, duplicate: true };
  }
  if (claimed.amountMismatch) console.warn("[VOUCHER PAYMENT] Paid total differs from snapshot price (discount/tax?) — crediting snapshot credits", { purchaseId: claimed.purchaseId, paid: claimed.amountPaid, price: claimed.amount });

  console.log("[VOUCHER PAYMENT] Credits being added:", claimed.credits, { purchaseId: claimed.purchaseId, userId: String(claimed.userId) });
  const session = await mongoose.startSession();
  try {
    let historyId = null;
    await session.withTransaction(async () => {
      const u = await User.findOneAndUpdate({ _id: claimed.userId }, { $inc: { walletBalance: claimed.credits } }, { new: true, session });
      if (!u) throw new Error("user_missing");
      const [h] = await WalletHistory.create(
        [{
          userId: claimed.userId,
          shop_id: claimed.shopId,
          amount: claimed.credits,
          currency: claimed.currency,
          draftOrderId: claimed.wixOrderId || "",
          transactionType: "voucher_purchase",
          referenceType: "voucher_purchase",
          referenceId: claimed._id,
          direction: "credit",
          description: `${claimed.voucherSnapshot?.name || "Credit pack"} purchased`,
          status: "success",
        }],
        { session, ordered: true },
      );
      historyId = h._id;
      const r = await VoucherPurchase.updateOne(
        { _id: claimed._id, status: "PROCESSING", creditsAdded: false },
        { $set: { status: "PAID", creditsAdded: true, paidAt: new Date(), walletHistoryId: h._id, lastError: "" }, $addToSet: { webhookEventIds: eventId || `manual:${Date.now()}` } },
        { session },
      );
      if (r.modifiedCount !== 1) throw new Error("purchase_state_changed");
      console.log("[BILLING DEBUG] wallet credited", { userId: String(claimed.userId), added: claimed.credits, newBalance: u.walletBalance });
    });
    console.log("[VOUCHER PAYMENT] Credits added", { purchaseId: claimed.purchaseId, credits: claimed.credits, historyId: String(historyId) });
    console.log("[VOUCHER PAYMENT] Finalized successfully", { purchaseId: claimed.purchaseId });
    return { ok: true, finalized: true, purchaseId: claimed.purchaseId };
  } catch (e) {
    await VoucherPurchase.updateOne({ _id: claimed._id, status: "PROCESSING", creditsAdded: false }, { $set: { status: "PENDING", lastError: `finalize:${e.message}` } });
    console.error("[VOUCHER PAYMENT] Finalization failed — claim released for retry", { purchaseId: claimed.purchaseId, error: e.message });
    return { ok: false, code: "finalize_failed" };
  } finally {
    session.endSession();
  }
}

/* ── 3. user-facing reads / cancel ───────────────────────────── */

async function getForUser({ user, purchaseId }) {
  const p = await VoucherPurchase.findOne({ purchaseId, userId: user._id });
  return p ? publicView(p) : null;
}

async function listForUser({ user, limit = 50 }) {
  const rows = await VoucherPurchase.find({ userId: user._id, status: { $ne: "PROCESSING" } }).sort({ createdAt: -1 }).limit(limit);
  return rows.map(publicView);
}

/** User closed the checkout: mark CANCELLED (a later PAID webhook still credits — see finalizePaid). */
async function cancelForUser({ user, purchaseId }) {
  const r = await VoucherPurchase.findOneAndUpdate(
    { purchaseId, userId: user._id, status: "PENDING", creditsAdded: false },
    { $set: { status: "CANCELLED", cancelledAt: new Date() } },
    { new: true },
  );
  if (r) console.log("[VOUCHER PURCHASE] Cancelled by user", { purchaseId });
  return r ? publicView(r) : await getForUser({ user, purchaseId });
}

/* ── 4. maintenance ──────────────────────────────────────────── */

async function sweep() {
  const now = Date.now();
  const stale = await VoucherPurchase.updateMany(
    { status: "PROCESSING", creditsAdded: false, processingAt: { $lt: new Date(now - PROCESSING_STALE_MS) } },
    { $set: { status: "PENDING", lastError: "processing_stale_reset" } },
  );
  const expired = await VoucherPurchase.updateMany(
    { status: "PENDING", creditsAdded: false, createdAt: { $lt: new Date(now - PENDING_TTL_MS) } },
    { $set: { status: "EXPIRED" } },
  );
  if (stale.modifiedCount || expired.modifiedCount) console.log("[VOUCHER PURCHASE] sweep", { staleReset: stale.modifiedCount, expired: expired.modifiedCount });
}

let sweepTimer = null;
function startMaintenance() {
  sweep().catch((e) => console.error("[VOUCHER PURCHASE] sweep error:", e.message));
  if (!sweepTimer) sweepTimer = setInterval(() => sweep().catch(() => {}), 15 * 60 * 1000);
  if (sweepTimer.unref) sweepTimer.unref();
}

module.exports = { createPurchase, handleOrderEvent, finalizePaid, getForUser, listForUser, cancelForUser, sweep, startMaintenance, publicView, CLAIMABLE };
