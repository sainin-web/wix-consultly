const axios = require("axios");
const { handleWixInstall } = require("./wix.service");
const { shopModel } = require("../Modal/shopify");
const { isV3 } = require("./wixCatalog");

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

/**
 * Fresh token for an INSTALLED instance only. handleWixInstall upserts a shop
 * row and asks Wix for a token — correct during installation, wrong here: an
 * unknown instanceId (e.g. the Wix dashboard "Trigger Test" event) must never
 * create a placeholder installation. So: look up the installed shop first,
 * and only refresh a token that already exists.
 */
async function instanceToken(instanceId) {
  const installed = await shopModel.findOne({ instanceId }).select("_id instanceId accessToken tokenExpiry");
  if (!installed) { const e = new Error("instance_not_installed"); e.code = "instance_not_installed"; throw e; }
  const shop = installed.accessToken && installed.tokenExpiry > Date.now() + 60000 ? installed : await handleWixInstall({ instanceId });
  if (!shop?.accessToken) throw new Error("wix_token_unavailable");
  return shop.accessToken;
}

/** Installed shop for a webhook instanceId, or null (unknown / test instance). */
async function findInstalledShop(instanceId) {
  if (!instanceId) return null;
  return shopModel.findOne({ instanceId }).select("_id instanceId shop_Domain accessToken");
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
  // Catalog V3 line items reference the product id plus the default variant
  // id in catalogReference.options.variantId (Catalog V3 ↔ eCommerce
  // integration). V1 line items use the product id alone.
  const catalogReference = { appId: WIX_STORES_APP_ID, catalogItemId: voucher.wixProductId };
  if (isV3(voucher.catalogVersion)) {
    const variantId = voucher.wixVariantId || (await findV3VariantId(token, voucher.wixProductId));
    if (variantId) catalogReference.options = { variantId };
    else console.warn("[WIX CHECKOUT] V3 product without a resolvable default variant", { productId: voucher.wixProductId });
  }
  console.log("[WIX CHECKOUT] line item", { catalog: isV3(voucher.catalogVersion) ? "V3" : "V1", productId: voucher.wixProductId, variantId: catalogReference.options?.variantId || null });
  let checkout;
  const request = { channelType: "WEB", lineItems: [{ quantity: 1, catalogReference }] };
  console.log("[WIX CHECKOUT] Create Checkout request", { instanceId, request });
  try {
    const { data } = await axios.post(`${API}/ecom/v1/checkouts`, request, { headers: headers(token) });
    checkout = data?.checkout;
    const lines = (checkout?.lineItems || []).map((li) => ({ id: li.id, catalogItemId: li.catalogReference?.catalogItemId, variantId: li.catalogReference?.options?.variantId, quantity: li.quantity, price: li.price?.amount, availability: li.availability?.status, name: li.productName?.original }));
    console.log("[WIX CHECKOUT] Create Checkout response", { checkoutId: checkout?.id || checkout?._id, currency: checkout?.currency, total: checkout?.priceSummary?.total?.amount, lines });
    // If Wix dropped/zeroed the line, the checkout page would show "sold out" and $0.00 — refuse it here.
    const bad = lines.find((l) => (l.availability && l.availability !== "AVAILABLE") || (l.price !== undefined && Number(l.price) <= 0));
    if (lines.length === 0 || bad) {
      const err = new Error("checkout_line_unavailable"); err.code = "checkout_line_unavailable"; err.detail = `The store reports this voucher as unavailable (${bad?.availability || "no line items"}, price ${bad?.price ?? "n/a"}).`; throw err;
    }
  } catch (e) {
    if (e.code === "checkout_line_unavailable") { console.error("[WIX CHECKOUT] line item unavailable:", e.detail); throw e; }
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

/** Token for an installed instance (exported for pre-checkout product verification). */
const tokenFor = (instanceId) => instanceToken(instanceId);

/** Server-to-server order verification (never trust the webhook body alone). */
async function getOrder({ instanceId, orderId }) {
  const token = await instanceToken(instanceId);
  const { data } = await axios.get(`${API}/ecom/v1/orders/${orderId}`, { headers: headers(token) });
  return data?.order || null;
}

module.exports = { createVoucherCheckout, getOrder, findInstalledShop, tokenFor, WIX_STORES_APP_ID, API };
