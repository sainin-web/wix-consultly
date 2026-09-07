const jwt = require("jsonwebtoken");

/**
 * Wix app webhooks arrive as a JWT (RS256) signed with the app's private key.
 * The matching PUBLIC key is shown in the Wix app dashboard → "View ID & keys"
 * (or Webhooks → Get Public Key). Put it in WIX_WEBHOOK_PUBLIC_KEY (PEM; "\n"
 * escapes are accepted).
 *
 * Decoded shape:
 *   { data: "<json>", iat, exp }
 *     data → { eventType, instanceId, identity, data: "<json>" }
 *       data → { id, entityFqdn, slug, entityId, eventTime, actionEvent: { body: {...} } }
 */
function publicKey() {
  const raw = process.env.WIX_WEBHOOK_PUBLIC_KEY || "";
  if (!raw.trim()) return null;
  let pem = raw.replace(/\\n/g, "\n").trim();
  if (!pem.includes("BEGIN")) pem = `-----BEGIN PUBLIC KEY-----\n${pem}\n-----END PUBLIC KEY-----`;
  return pem;
}

const parseJson = (v) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch (e) { return null; } };

/**
 * @returns {{ verified: boolean, reason?: string, envelope?: object, event?: object }}
 *   envelope = { eventType, instanceId, identity }  event = inner event object
 */
function verifyWixWebhook(rawJwt) {
  const token = String(rawJwt || "").trim();
  if (!token || token.split(".").length !== 3) return { verified: false, reason: "not_a_jwt" };
  const key = publicKey();
  if (!key) return { verified: false, reason: "public_key_not_configured" };
  let decoded;
  try {
    decoded = jwt.verify(token, key, { algorithms: ["RS256"] });
  } catch (e) {
    return { verified: false, reason: `signature_invalid:${e.message}` };
  }
  const envelope = parseJson(decoded?.data) || decoded;
  const event = parseJson(envelope?.data) || envelope?.data || null;
  return { verified: true, envelope: { eventType: envelope?.eventType, instanceId: envelope?.instanceId, identity: parseJson(envelope?.identity) || envelope?.identity }, event };
}

/** Unverified decode (legacy install pings). NEVER use for anything that moves money. */
function decodeWixWebhook(rawJwt) {
  const decoded = jwt.decode(String(rawJwt || ""));
  if (!decoded) return null;
  const envelope = parseJson(decoded?.data) || decoded;
  const event = parseJson(envelope?.data) || envelope?.data || null;
  return { envelope, event };
}

module.exports = { verifyWixWebhook, decodeWixWebhook, hasPublicKey: () => Boolean(publicKey()) };
