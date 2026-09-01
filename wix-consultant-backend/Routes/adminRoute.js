const express = require("express");
const {
  adminController,
  voucherController,
  getTransactionController,
  getUserConsultantController,
  getShopAllUserController,
  getShopAllConsultantController,
  updateUserConsultantController,
  appEnableAndDisableController,
  checkAppBillingController,
  voucherHandlerController,
  updatesVoucherController,
  getWithdrawalRequest,
  updateConsultantWidthrawalRequest,
  declineWithdrawalRequest,
  updateAdminPercentage,
  checkAppBillingController_and_Installection,
  getShopAllConsultant,
} = require("../Controller/adminController");
const { requireAdminAuth } = require("../MiddleWare/requireAdminAuth");
const adminRoute = express.Router();

adminRoute.get(
  "/admin/check/billing/installection",
  checkAppBillingController_and_Installection
);
adminRoute.get(
  "/admin/check/billing/installation",
  checkAppBillingController_and_Installection
);


adminRoute.get("/shop/all-consultant/:adminId",requireAdminAuth, getShopAllConsultant);
adminRoute.get("/admin/:adminId",requireAdminAuth, adminController);
adminRoute.post("/admin/voucher/:adminId", requireAdminAuth, voucherController);
adminRoute.get("/activity/transactions/:adminId", requireAdminAuth, getTransactionController);
adminRoute.get("/user/consultant/:adminId", requireAdminAuth, getUserConsultantController);
adminRoute.get("/shop/all-user/:adminId", requireAdminAuth, getShopAllUserController);
// adminRoute.get("/shop/all-consultant/:adminId", requireAdminAuth, getShopAllConsultantController);
adminRoute.post("/update-wallet/:adminId", requireAdminAuth, updateUserConsultantController);
adminRoute.post("/app-enable-and-disable/:adminId", requireAdminAuth, appEnableAndDisableController);
adminRoute.get("/shop/billing-status/:adminId", requireAdminAuth, checkAppBillingController);
adminRoute.delete("/delete/voucher/:shopId/:voucherId", requireAdminAuth, voucherHandlerController);
adminRoute.put("/admin/voucher-updates/:shopId/:voucherId", requireAdminAuth, updatesVoucherController);
adminRoute.get("/withdrawal-requests/:adminId", requireAdminAuth, getWithdrawalRequest);
adminRoute.put("/update/widthrwal/req/:adminId", requireAdminAuth, updateConsultantWidthrawalRequest);
adminRoute.put("/declin/widthrwal/req/:transactionId", requireAdminAuth, declineWithdrawalRequest);
adminRoute.put("/admin/update-percentage/:adminId", requireAdminAuth, updateAdminPercentage);



module.exports = { adminRoute };    