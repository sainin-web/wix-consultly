const axios = require("axios");

/**
 * Wix Stores catalog client with explicit V1 / V3 routing.
 *
 * Get Catalog Version  GET  /stores/v3/provision/version → V1_CATALOG | V3_CATALOG | STORES_NOT_INSTALLED
 *
 * V1 (Catalog V1)                        V3 (Catalog V3)
 *   POST   /stores/v1/products             POST   /stores/v3/products
 *   PATCH  /stores/v1/products/{id}        PATCH  /stores/v3/products/{id}   (needs current revision)
 *   DELETE /stores/v1/products/{id}        DELETE /stores/v3/products/{id}
 *                                          GET    /stores/v3/products/{id}
 *
 * A voucher is a credit pack: one product, ONE default variant, no options.
 *
 * INVENTORY (the "sold out" trap): plain Create Product does NOT create
 * inventory items, and a V3 variant without an inventory item is OUT_OF_STOCK,
 * so Wix Checkout drops the line ("sold out or no longer available", $0.00,
 * 0 items). Vouchers are therefore created with
 *   POST /stores/v3/products-with-inventory  variants[0].inventoryItem { inStock: true }
 * = untracked, always available, never decremented by orders. Existing
 * products are repaired with POST /stores/v3/inventory-items { inStock: true }.
 * V3 requires `variantsInfo.variants[0]` with `price.actualPrice.amount`
 * (string) and `choices: []`; PHYSICAL products must also pass
 * `physicalProperties` (an empty object is valid — pricePerUnit is optional).
 * DIGITAL would need an uploaded digital file, so packs are PHYSICAL on both
 * catalogs, exactly as the original V1 implementation did.
 *
 * Stored `catalogVersion` is normalized to "V1" | "V3".
 */
const API = (process.env.WIX_API_BASE || "https://www.wixapis.com").replace(/\/$/, "");
const headers = (token) => ({ Authorization: token, "Content-Type": "application/json" });

/** "V3_CATALOG" | "V3" → "V3"; "V1_CATALOG" | "V1" | undefined → "V1"; STORES_NOT_INSTALLED → "NONE" */
function normalizeCatalogVersion(raw) {
  const v = String(raw || "").toUpperCase();
  if (v.startsWith("V3")) return "V3";
  if (v === "STORES_NOT_INSTALLED" || v === "NONE") return "NONE";
  return "V1";
}
const isV3 = (raw) => normalizeCatalogVersion(raw) === "V3";

/** Sanitized error info for logs/responses — never the token, never the full body. */
function wixErrorInfo(e) {
  const d = e.response?.data || {};
  return {
    httpStatus: e.response?.status || null,
    code: d?.details?.applicationError?.code || d?.code || null,
    message: d?.message || e.message,
    description: d?.details?.applicationError?.description || null,
  };
}

async function getCatalogVersion(token) {
  const { data } = await axios.get(`${API}/stores/v3/provision/version`, { headers: headers(token) });
  return { raw: data?.catalogVersion || "", version: normalizeCatalogVersion(data?.catalogVersion) };
}

const money = (n) => Number(n).toFixed(2);
const escapeHtml = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ── payload builders ───────────────────────────────────────── */

function buildV1Payload({ name, description, price }) {
  return {
    product: {
      name,
      description,
      priceData: { price: Number(price) },
      productType: "physical",
      visible: true,
    },
  };
}

// PHYSICAL is the type Wix accepts for a file-less product (DIGITAL requires an
// uploaded digital file). VOUCHER_PRODUCT_TYPE lets a site try SERVICE, which
// the current Wix schema lists as a productType, without a code change.
const V3_PRODUCT_TYPE = (process.env.VOUCHER_PRODUCT_TYPE || "PHYSICAL").toUpperCase();

function buildV3Payload({ name, description, price, productType = V3_PRODUCT_TYPE }) {
  const product = {
    name,
    plainDescription: `<p>${escapeHtml(description)}</p>`,
    productType,
    visible: true,
    variantsInfo: {
      variants: [
        {
          price: { actualPrice: { amount: money(price) } },
          choices: [], // no options → single default variant
          visible: true,
          // untracked stock: always purchasable, never "sold out"
          inventoryItem: { inStock: true },
        },
      ],
    },
  };
  if (productType === "PHYSICAL") product.physicalProperties = {};
  return { product };
}

/** Sanitized view of a V3 product for logs (no tokens, no rich content). */
function summarizeV3(p) {
  const variants = (p?.variantsInfo?.variants || []).map((v) => ({ id: v.id || v._id, visible: v.visible, price: v.price?.actualPrice?.amount, choices: (v.choices || []).length, inventoryStatus: v.inventoryStatus }));
  return { id: p?.id || p?._id, name: p?.name, productType: p?.productType, visible: p?.visible, currency: p?.currency, revision: p?.revision, availability: p?.inventory?.availabilityStatus, variantCount: variants.length, variants };
}

/** Read a V3 product back. Returns null on 404. */
async function readV3Product(token, productId) {
  try {
    const { data } = await axios.get(`${API}/stores/v3/products/${productId}`, { params: { fields: "CURRENCY" }, headers: headers(token) });
    return data?.product || null;
  } catch (e) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

/** Ensure the default variant has an untracked IN_STOCK inventory item (self-heal for older products). */
async function ensureVariantInStock({ token, productId, variantId, log = console.log }) {
  try {
    await axios.post(`${API}/stores/v3/inventory-items`, { inventoryItem: { productId, variantId, inStock: true } }, { headers: headers(token) });
    log("[VOUCHER INVENTORY] Inventory item created (inStock: true)", { productId, variantId });
    return { repaired: true };
  } catch (e) {
    const code = e.response?.data?.details?.applicationError?.code;
    if (e.response?.status !== 409 && code !== "ITEM_ALREADY_EXISTS") throw e;
  }
  // An item exists but the product reports OUT_OF_STOCK → flip it to inStock.
  const { data } = await axios.post(`${API}/stores/v3/inventory-items/query`, { query: { filter: { variantId } } }, { headers: headers(token) });
  const item = (data?.inventoryItems || [])[0];
  if (!item) throw Object.assign(new Error("inventory_item_missing"), { code: "inventory_item_missing" });
  if (item.availabilityStatus === "IN_STOCK") return { repaired: false };
  await axios.patch(`${API}/stores/v3/inventory-items/${item.id}`, { inventoryItem: { revision: item.revision, inStock: true } }, { headers: headers(token) });
  log("[VOUCHER INVENTORY] Inventory item set to inStock: true", { productId, variantId, inventoryItemId: item.id });
  return { repaired: true };
}

/**
 * Read the product back from Wix and decide whether it can enter checkout.
 * Never trusts the stored variant id blindly: for a no-option product the ONE
 * variant Wix returns is the default variant, and that id is what checkout needs.
 * @returns {{ ok:true, variantId, price, currency, availability, repaired, state } | { ok:false, code, message, state }}
 */
async function verifyV3Purchasable({ token, productId, variantId, expectedPrice, log = console.log, repair = true }) {
  const p = await readV3Product(token, productId);
  if (!p) return { ok: false, code: "product_missing", message: "Voucher product no longer exists in the Wix store.", state: null };
  let state = summarizeV3(p);
  const variants = p.variantsInfo?.variants || [];
  let v = variants.find((x) => (x.id || x._id) === variantId) || null;
  if (!v && variants.length === 1) { v = variants[0]; log("[VOUCHER VERIFY] Stored variant id not found — adopting the product's only variant", { productId, stored: variantId || null, actual: v.id || v._id }); }
  if (!v) return { ok: false, code: "variant_missing", message: "Voucher product exists but its Wix variant is unavailable.", state };
  const vid = v.id || v._id;
  if (p.visible === false || v.visible === false) return { ok: false, code: "product_hidden", message: "Voucher product is hidden in the Wix store.", state };
  const price = Number(v.price?.actualPrice?.amount);
  if (!Number.isFinite(price) || price <= 0) return { ok: false, code: "price_invalid", message: "Voucher price is invalid in the Wix catalog.", state };
  if (expectedPrice !== undefined && Math.abs(price - Number(expectedPrice)) > 0.005) log("[VOUCHER VERIFY] Price differs from the voucher record", { productId, wix: price, voucher: Number(expectedPrice) });

  let availability = p.inventory?.availabilityStatus || v.inventoryStatus?.availabilityStatus || "UNKNOWN";
  let repaired = false;
  if (availability !== "IN_STOCK" && availability !== "PREORDER") {
    if (!repair) return { ok: false, code: "out_of_stock", message: "Voucher product exists but its Wix variant is out of stock.", state };
    log("[VOUCHER VERIFY] Variant not in stock → repairing inventory", { productId, variantId: vid, availability });
    try {
      const r = await ensureVariantInStock({ token, productId, variantId: vid, log });
      repaired = r.repaired;
      const again = await readV3Product(token, productId);
      state = summarizeV3(again);
      availability = again?.inventory?.availabilityStatus || "UNKNOWN";
    } catch (e) {
      return { ok: false, code: "inventory_repair_failed", message: "Voucher product is out of stock in Wix and could not be repaired.", detail: wixErrorInfo(e), state };
    }
    if (availability !== "IN_STOCK" && availability !== "PREORDER" && availability !== "UNKNOWN") return { ok: false, code: "out_of_stock", message: "Voucher product exists but its Wix variant is out of stock.", state };
  }
  return { ok: true, variantId: vid, price, currency: p.currency || null, availability, repaired, state };
}

/* ── CRUD ───────────────────────────────────────────────────── */

/** @returns {{ productId, slug, variantId|null, payload }} */
async function createVoucherProduct({ token, version, name, description, price, log = console.log }) {
  const v = normalizeCatalogVersion(version);
  if (v === "NONE") { const e = new Error("stores_not_installed"); e.code = "stores_not_installed"; throw e; }
  if (v === "V3") {
    log("[VOUCHER CREATE] Using V3 product API (products-with-inventory)");
    let payload = buildV3Payload({ name, description, price });
    log("[VOUCHER CREATE] Product payload prepared", { catalog: "V3", name, price: money(price), productType: payload.product.productType, variants: 1, inventory: "inStock:true (untracked)" });
    let data;
    try {
      ({ data } = await axios.post(`${API}/stores/v3/products-with-inventory`, payload, { headers: headers(token) }));
    } catch (e) {
      // A site may reject a non-PHYSICAL type; fall back to PHYSICAL once and say so.
      if (payload.product.productType !== "PHYSICAL" && e.response?.status === 400) {
        log("[VOUCHER CREATE] productType rejected → retrying as PHYSICAL", wixErrorInfo(e));
        payload = buildV3Payload({ name, description, price, productType: "PHYSICAL" });
        ({ data } = await axios.post(`${API}/stores/v3/products-with-inventory`, payload, { headers: headers(token) }));
      } else throw e;
    }
    const p = data?.product || {};
    log("[VOUCHER CREATE] Wix V3 create response", summarizeV3(p));
    const productId = p.id || p._id;
    // Read back: the stored variant id must be the one Wix actually holds, and stock must be IN_STOCK.
    const check = await verifyV3Purchasable({ token, productId, variantId: p.variantsInfo?.variants?.[0]?.id, expectedPrice: price, log });
    log("[VOUCHER CREATE] Read-back verification", { ok: check.ok, code: check.code || null, state: check.state });
    if (!check.ok) { const e = new Error("product_not_purchasable"); e.code = check.code; e.detail = check.message; e.productId = productId; throw e; }
    return { productId, slug: p.slug, variantId: check.variantId, revision: p.revision, price: check.price, currency: check.currency, availability: check.availability };
  }
  log("[VOUCHER CREATE] Using V1 product API");
  const payload = buildV1Payload({ name, description, price });
  log("[VOUCHER CREATE] Product payload prepared", { catalog: "V1", name, price: Number(price) });
  const { data } = await axios.post(`${API}/stores/v1/products`, payload, { headers: headers(token) });
  const p = data?.product || {};
  return { productId: p.id || p._id, slug: p.slug, variantId: null, revision: null };
}

async function getV3Product(token, productId) {
  const { data } = await axios.get(`${API}/stores/v3/products/${productId}`, { headers: headers(token) });
  return data?.product || null;
}

/** Update name and/or price on the existing product (V1 PATCH, or V3 PATCH with revision + default variant id). */
async function updateVoucherProduct({ token, version, productId, name, price, log = console.log }) {
  if (isV3(version)) {
    const current = await getV3Product(token, productId);
    if (!current) { const e = new Error("product_not_found"); e.code = "product_not_found"; throw e; }
    const variant = current.variantsInfo?.variants?.[0];
    const product = { revision: current.revision };
    if (name !== undefined) product.name = name;
    if (price !== undefined && variant) {
      product.options = [];
      product.variantsInfo = { variants: [{ id: variant.id || variant._id, price: { actualPrice: { amount: money(price) } }, choices: [] }] };
    }
    log("[VOUCHER UPDATE] Using V3 product API", { productId, fields: Object.keys(product) });
    const { data } = await axios.patch(`${API}/stores/v3/products/${productId}`, { product }, { headers: headers(token) });
    const p = data?.product || {};
    return { productId: p.id || productId, variantId: p.variantsInfo?.variants?.[0]?.id || (variant && (variant.id || variant._id)) || null };
  }
  const product = {};
  if (name !== undefined) product.name = name;
  if (price !== undefined) product.priceData = { price: Number(price) };
  log("[VOUCHER UPDATE] Using V1 product API", { productId, fields: Object.keys(product) });
  const { data } = await axios.patch(`${API}/stores/v1/products/${productId}`, { product }, { headers: headers(token) });
  return { productId: data?.product?.id || productId, variantId: null };
}

/** Delete the store product. A 404 is treated as already gone. */
async function deleteVoucherProduct({ token, version, productId, log = console.log }) {
  const url = isV3(version) ? `${API}/stores/v3/products/${productId}` : `${API}/stores/v1/products/${productId}`;
  log(`[VOUCHER DELETE] Using ${isV3(version) ? "V3" : "V1"} product API`, { productId });
  try {
    await axios.delete(url, { headers: headers(token) });
    return { deleted: true };
  } catch (e) {
    if (e.response?.status === 404) return { deleted: false, alreadyGone: true };
    throw e;
  }
}

module.exports = { normalizeCatalogVersion, isV3, getCatalogVersion, createVoucherProduct, updateVoucherProduct, deleteVoucherProduct, getV3Product, readV3Product, verifyV3Purchasable, ensureVariantInStock, summarizeV3, wixErrorInfo, buildV1Payload, buildV3Payload };
