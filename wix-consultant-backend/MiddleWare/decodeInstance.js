const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

function padBase64(input) {
  const s = String(input).replace(/-/g, "+").replace(/_/g, "/");
  const remainder = s.length % 4;
  if (remainder === 0) return s;
  return s + "=".repeat(4 - remainder);
}

const decodeInstance = (instance) => {
  try {
    if (!instance) return null;

    const trimmed = String(instance).trim();
    if (!trimmed) return null;

    // Wix instance UUID
    if (UUID_RE.test(trimmed)) {
      return { instanceId: trimmed };
    }

    // Shop Mongo _id sometimes passed as ?instance= from iframe fallback
    if (OBJECT_ID_RE.test(trimmed)) {
      return { shopMongoId: trimmed };
    }

    const parts = trimmed.split(".");

    let payload = null;

    if (parts.length === 2) {
      // Wix dashboard ?instance= format: signature.payload
      payload = parts[1];
    } else if (parts.length === 3) {
      // Standard JWT: header.payload.signature
      payload = parts[1];
    } else if (parts.length >= 5) {
      payload = parts[3];
    } else {
      return null;
    }

    const decoded = Buffer.from(padBase64(payload), "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch (err) {
    console.warn("decodeInstance failed:", err.message);
    return null;
  }
};

module.exports = { decodeInstance, padBase64 };
