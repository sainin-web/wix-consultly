const express = require("express");
const { requireAdminAuth } = require("../MiddleWare/requireAdminAuth");
const {
  getStorefrontStatus,
  createEditorDeepLink,
} = require("../Controller/onboardingController");

const onboardingRoute = express.Router();

// Storefront setup wizard — both guarded by the existing admin JWT
onboardingRoute.get(
  "/storefront-status/:adminId",
  requireAdminAuth,
  getStorefrontStatus,
);
onboardingRoute.post(
  "/editor-deep-link/:adminId",
  requireAdminAuth,
  createEditorDeepLink,
);

module.exports = { onboardingRoute };
