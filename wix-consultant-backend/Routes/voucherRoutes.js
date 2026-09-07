const express = require("express");
const { requireCustomer } = require("../MiddleWare/requireCustomer");
const c = require("../Controller/voucherController");

const voucherRoutes = express.Router();

voucherRoutes.post("/purchase", requireCustomer, c.createPurchase);
voucherRoutes.get("/purchases", requireCustomer, c.listPurchases);
voucherRoutes.get("/purchase/:purchaseId", requireCustomer, c.getPurchase);
voucherRoutes.post("/purchase/:purchaseId/cancel", requireCustomer, c.cancelPurchase);

module.exports = { voucherRoutes };
