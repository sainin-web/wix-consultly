const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { User } = require("../Modal/userSchema");

/**
 * Customer session token — minted ONLY by /api/wix-user-session after the
 * member was verified against Wix (members/v1/members/my with the site's
 * member access token). Claims: { typ: "customer", sub: <mongo user id>,
 * wixMemberId, instanceId }. Consultant/admin tokens are rejected here, and
 * customer tokens are rejected by the consultant/admin guards (typ check).
 */
const TTL_HOURS = Number(process.env.CUSTOMER_TOKEN_TTL_HOURS) || 12;

function signCustomerToken({ userId, wixMemberId, instanceId }) {
  return jwt.sign(
    { typ: "customer", sub: String(userId), wixMemberId: String(wixMemberId || ""), instanceId: String(instanceId || "") },
    process.env.JWT_SECRET_KEY,
    { expiresIn: `${TTL_HOURS}h` },
  );
}

async function requireCustomer(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ success: false, code: "unauthenticated", message: "Please sign in to continue." });
    let decoded;
    try {
      decoded = jwt.verify(m[1], process.env.JWT_SECRET_KEY);
    } catch (e) {
      return res.status(401).json({ success: false, code: "token_invalid", message: "Your session has expired. Please refresh the page and sign in again." });
    }
    if (decoded?.typ !== "customer" || !mongoose.Types.ObjectId.isValid(decoded.sub)) {
      return res.status(401).json({ success: false, code: "not_a_customer_token", message: "Please sign in as a site member." });
    }
    const user = await User.findById(decoded.sub).select("_id fullname email walletBalance instanceId shop_id wixMemberId userType");
    if (!user) return res.status(401).json({ success: false, code: "user_not_found", message: "Account not found." });
    req.user = user;
    req.customerClaims = decoded;
    next();
  } catch (e) {
    return res.status(500).json({ success: false, message: "Authentication error" });
  }
}

module.exports = { requireCustomer, signCustomerToken };
