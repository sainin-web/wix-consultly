const axios = require("axios");
const { handleWixInstall } = require("./wix.service");

/**
 * Thin, documented client for the Wix eCommerce REST APIs used by the voucher
 * purchase flow. Every call uses the app instance's OAuth token (client
 * credentials per instance — the same token the admin voucher creation uses).
 *
 * Endpoints (official):
 *   POST /ecom/v1/checkouts                       Create Checkout
 *   GET  /ecom/v1/checkouts/{id}/checkout-url     Get Checkout URL
 *   GET  /ecom/v1/checkouts/{id}                  Get Checkout
 *   GET  /ecom/v1/orders/{id}                     Get Order
 *   GET  /stores/v3/products/{id}                 (catalog V3 variant lookup)
 *
 * Required app permissions: Manage eCommerce (checkouts) + Read Orders.
 * WIX_API_BASE is overridable ONLY so the E2E harness can point at a mock.
 */
const API = (process.env.WIX_API_BASE || "https://www.wixapis.com").replace(/\/$/, "");
const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e"; // Wix Stores catalog (documented constant)

const headers = (token) => ({ Authorization: token, "Content-Type": "application/json" });
const errInfo = (e) => e.response?.data?.message || e.response?.data?.details?.applicationError?.code || e.response?.status || e.message;

/** Fresh instance token (refreshes via client credentials if expired). */
async function instanceToken(instanceId) {
  const shop = await handleWixInstall({ instanceId });
  if (!shop?.accessToken) throw new Error("wix_token_unavailable");
  return shop.accessToken;
}

/** Catalog V3 products carry variants; a checkout line needs the variant id. */
async function findV3VariantId(token, productId) {
  try {
    const { data } = await axios.get(`${API}/stores/v3/products/${productId}`, { headers: headers(token) });
    const variants = data?.product?.variantsInfo?.variants || data?.product?.variants || [];
    const v = variants[0];
    return v?.id || v?._id || null;
  } catch (e) {
    console.warn("[WIX CHECKOUT] variant lookup failed (continuing without variantId):", errInfo(e));
    return null;
  }
}

/**
 * Create a checkout holding exactly one voucher product.
 * @returns {{ checkoutId, purchaseFlowId, checkoutUrl }}
 */
async function createVoucherCheckout({ instanceId, voucher }) {
  const token = await instanceToken(instanceId);
  const catalogReference = { appId: WIX_STORES_APP_ID, catalogItemId: voucher.wixProductId };
  if (voucher.catalogVersion === "V3") {
    const variantId = await findV3VariantId(token, voucher.wixProductId);
    if (variantId) catalogReference.options = { variantId };
  }
  let checkout;
  try {
    const { data } = await axios.post(
      `${API}/ecom/v1/checkouts`,
      { channelType: "WEB", lineItems: [{ quantity: 1, catalogReference }] },
      { headers: headers(token) },
    );
    checkout = data?.checkout;
  } catch (e) {
    console.error("[WIX CHECKOUT] create failed:", errInfo(e));
    const err = new Error("wix_checkout_failed"); err.status = e.response?.status; err.detail = errInfo(e); throw err;
  }
  const checkoutId = checkout?.id || checkout?._id;
  if (!checkoutId) throw Object.assign(new Error("wix_checkout_failed"), { detail: "no checkout id in response" });
  console.log("[WIX CHECKOUT] Checkout created:", checkoutId);

  let checkoutUrl = checkout?.checkoutUrl || null;
  if (!checkoutUrl) {
    try {
      const { data } = await axios.get(`${API}/ecom/v1/checkouts/${checkoutId}/checkout-url`, { headers: headers(token) });
      checkoutUrl = data?.checkoutUrl || data?.url || null;
    } catch (e) {
      console.error("[WIX CHECKOUT] checkout-url failed:", errInfo(e));
      const err = new Error("wix_checkout_url_failed"); err.status = e.response?.status; err.detail = errInfo(e); throw err;
    }
  }
  if (!checkoutUrl) throw Object.assign(new Error("wix_checkout_url_failed"), { detail: "no checkoutUrl in response" });
  return { checkoutId: String(checkoutId), purchaseFlowId: checkout?.purchaseFlowId || null, checkoutUrl };
}

/** Server-to-server order verification (never trust the webhook body alone). */
async function getOrder({ instanceId, orderId }) {
  const token = await instanceToken(instanceId);
  const { data } = await axios.get(`${API}/ecom/v1/orders/${orderId}`, { headers: headers(token) });
  return data?.order || null;
}

module.exports = { createVoucherCheckout, getOrder, WIX_STORES_APP_ID, API };
