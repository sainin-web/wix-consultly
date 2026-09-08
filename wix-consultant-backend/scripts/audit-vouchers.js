/**
 * READ-ONLY audit of every voucher's real state in Wix (Catalog V3 + inventory).
 * Run on the server where MONGO_DB_URL is reachable:
 *   node scripts/audit-vouchers.js
 * Prints, per voucher: product id, variant ids, prices, visibility, availability
 * and inventory items. Never writes to Wix or Mongo. No tokens are printed.
 *
 * To repair legacy vouchers (missing inventory / stale variant id) use the
 * admin endpoint:  PUT /api/admin/admin/voucher-repair/:shopId  (admin JWT)
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const axios = require("axios");
const { shopModel } = require("../Modal/shopify");
const { handleWixInstall } = require("../services/wix.service");
const wixCatalog = require("../services/wixCatalog");

const API = (process.env.WIX_API_BASE || "https://www.wixapis.com").replace(/\/$/, "");
const H = (t) => ({ Authorization: t, "Content-Type": "application/json" });

(async () => {
  await mongoose.connect(process.env.MONGO_DB_URL, { serverSelectionTimeoutMS: 8000 });
  const shops = await shopModel.find({ "vouchers.0": { $exists: true } }).lean();
  for (const shop of shops) {
    console.log(`\n=== SHOP ${shop.instanceId} ${shop.shop_Domain || ""} vouchers=${shop.vouchers.length}`);
    let token;
    try { token = (await handleWixInstall({ instanceId: shop.instanceId })).accessToken; } catch (e) { console.log("  token refresh failed:", e.message); continue; }
    try { console.log("  catalog:", (await wixCatalog.getCatalogVersion(token)).raw); } catch (e) { console.log("  version error:", wixCatalog.wixErrorInfo(e)); }
    for (const v of shop.vouchers) {
      console.log(`\n  -- ${v._id} "${v.name || ""}" total=${v.totalCoin} extra=${v.extraCoin} price=${v.price} catalog=${v.catalogVersion} active=${v.active !== false} product=${v.wixProductId || "(none)"} variant=${v.wixVariantId || "(none)"}`);
      if (!v.wixProductId) continue;
      try {
        if (wixCatalog.isV3(v.catalogVersion)) {
          const p = await wixCatalog.readV3Product(token, v.wixProductId);
          if (!p) { console.log("     PRODUCT MISSING in Wix"); continue; }
          console.log("     product:", JSON.stringify(wixCatalog.summarizeV3(p)));
          try {
            const inv = await axios.post(`${API}/stores/v3/inventory-items/query`, { query: { filter: { productId: v.wixProductId } } }, { headers: H(token) });
            console.log("     inventory:", JSON.stringify((inv.data.inventoryItems || []).map((i) => ({ id: i.id, variantId: i.variantId, trackQuantity: i.trackQuantity, inStock: i.inStock, quantity: i.quantity, availabilityStatus: i.availabilityStatus }))));
          } catch (e) { console.log("     inventory query error:", JSON.stringify(wixCatalog.wixErrorInfo(e))); }
          const check = await wixCatalog.verifyV3Purchasable({ token, productId: v.wixProductId, variantId: v.wixVariantId, expectedPrice: v.price, repair: false, log: () => {} });
          console.log("     verdict:", check.ok ? `PURCHASABLE variant=${check.variantId} price=${check.price} ${check.currency || ""} availability=${check.availability}` : `NOT PURCHASABLE (${check.code}: ${check.message})`);
        } else {
          const { data } = await axios.get(`${API}/stores/v1/products/${v.wixProductId}`, { headers: H(token) });
          const p = data.product || {};
          console.log("     V1 product:", JSON.stringify({ id: p.id, name: p.name, visible: p.visible, productType: p.productType, price: p.priceData?.price, inStock: p.stock?.inStock, trackInventory: p.stock?.trackInventory }));
        }
      } catch (e) {
        console.log("     fetch error:", JSON.stringify(wixCatalog.wixErrorInfo(e)));
      }
    }
  }
  await mongoose.disconnect();
})().catch((e) => { console.error("audit failed:", e.message); process.exit(1); });
