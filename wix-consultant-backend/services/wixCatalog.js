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

function buildV3Payload({ name, description, price }) {
  return {
    product: {
      name,
      plainDescription: `<p>${escapeHtml(description)}</p>`,
      productType: "PHYSICAL",
      physicalProperties: {},
      visible: true,
      variantsInfo: {
        variants: [
          {
            price: { actualPrice: { amount: money(price) } },
            choices: [], // no options → single default variant
            visible: true,
          },
        ],
      },
    },
  };
}

/* ── CRUD ───────────────────────────────────────────────────── */

/** @returns {{ productId, slug, variantId|null, payload }} */
async function createVoucherProduct({ token, version, name, description, price, log = console.log }) {
  const v = normalizeCatalogVersion(version);
  if (v === "NONE") { const e = new Error("stores_not_installed"); e.code = "stores_not_installed"; throw e; }
  if (v === "V3") {
    log("[VOUCHER CREATE] Using V3 product API");
    const payload = buildV3Payload({ name, description, price });
    log("[VOUCHER CREATE] Product payload prepared", { catalog: "V3", name, price: money(price), variants: 1 });
    const { data } = await axios.post(`${API}/stores/v3/products`, payload, { headers: headers(token) });
    const p = data?.product || {};
    const variant = p.variantsInfo?.variants?.[0];
    return { productId: p.id || p._id, slug: p.slug, variantId: variant?.id || variant?._id || null, revision: p.revision };
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

module.exports = { normalizeCatalogVersion, isV3, getCatalogVersion, createVoucherProduct, updateVoucherProduct, deleteVoucherProduct, getV3Product, wixErrorInfo, buildV1Payload, buildV3Payload };
