const svc = require("../services/voucherPurchase");
const { parsePage } = require("../Utils/paginate");

/**
 * POST /api/vouchers/purchase          { voucherId }        → { purchaseId, checkoutUrl }
 * GET  /api/vouchers/purchase/:id                            → own purchase only
 * POST /api/vouchers/purchase/:id/cancel                     → own purchase only
 * GET  /api/vouchers/purchases                               → own history
 *
 * The frontend sends ONLY voucherId. userId comes from the verified customer
 * token (requireCustomer); price and credits come from the DB.
 */
const createPurchase = async (req, res) => {
  try {
    const { voucherId } = req.body || {};
    const ignored = Object.keys(req.body || {}).filter((k) => k !== "voucherId");
    if (ignored.length) console.warn("[VOUCHER PURCHASE] Ignoring client-supplied fields:", ignored.join(", "));
    const r = await svc.createPurchase({ user: req.user, claims: req.customerClaims, voucherId });
    if (!r.ok) return res.status(r.status || 400).json({ success: false, code: r.code, message: r.message });
    return res.status(201).json({ success: true, purchaseId: r.purchase.purchaseId, checkoutUrl: r.purchase.wixCheckoutUrl, purchase: svc.publicView(r.purchase) });
  } catch (e) {
    console.error("[VOUCHER PURCHASE] create error:", e.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getPurchase = async (req, res) => {
  try {
    const p = await svc.getForUser({ user: req.user, purchaseId: req.params.purchaseId });
    if (!p) return res.status(404).json({ success: false, code: "not_found", message: "Purchase not found." });
    return res.status(200).json({ success: true, purchase: p, walletBalance: Number(req.user.walletBalance) || 0 });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const cancelPurchase = async (req, res) => {
  try {
    const p = await svc.cancelForUser({ user: req.user, purchaseId: req.params.purchaseId });
    if (!p) return res.status(404).json({ success: false, code: "not_found", message: "Purchase not found." });
    return res.status(200).json({ success: true, purchase: p });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const listPurchases = async (req, res) => {
  try {
    const { rows, pagination } = await svc.listForUser({ user: req.user, page: parsePage(req.query) });
    return res.status(200).json({ success: true, purchases: rows, pagination, walletBalance: Number(req.user.walletBalance) || 0 });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { createPurchase, getPurchase, cancelPurchase, listPurchases };
