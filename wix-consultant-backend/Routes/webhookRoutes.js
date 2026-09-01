const express = require("express");
const { wixWebhookController, wixOrderWebhook } = require("../Controller/webhookController");

const webhookRoutes = express.Router();

// ─── Wix Webhook URL ─────────────────────────────────────────────────────────
// Set this in Wix Dev Center → Webhooks → Webhook URL:
//   https://your-domain.com/api/wix/webhook
// Wix fires this async with a JWT body containing eventType + instanceId
webhookRoutes.post(
  "/wix/webhook",
  express.raw({ type: "*/*" }),
  wixWebhookController
);

// ─── Keep /wix/initialize as alias (in case Wix Dev Center still points here) ─
webhookRoutes.post(
  "/wix/initialize",
  express.raw({ type: "*/*" }),
  wixWebhookController
);

webhookRoutes.post(
  "/wix/order-webhook",
  express.raw({ type: "*/*" }),
  wixOrderWebhook
);

module.exports = { webhookRoutes };
