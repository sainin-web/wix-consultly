const express = require("express");
const {
  getAllConsultantWixStoreFront,
  buyVoucherController,
} = require("../Controller/wixStroeFrontController");
const wixStroeFrontRoute = express.Router();

wixStroeFrontRoute.get(
  "/consultant/wix-store-front",
  getAllConsultantWixStoreFront,
);
wixStroeFrontRoute.post(
  "/buy-voucher/:adminId",
  buyVoucherController,
);
module.exports = {wixStroeFrontRoute};
  