/**
 * Canonical localStorage keys for Wix app roles.
 * Storefront customer Mongo _id: use getCustomerId() / persistCustomerId() only (KEYS.CUSTOMER_ID).
 */

export const KEYS = {
  SHOP_ID: "wix_id",
  INSTANCE: "wix_instance",
  ACCESS_TOKEN: "wix_access_token",
  CONSULTANT_ID: "wix_consultant_id",
  CONSULTANT_TOKEN: "token",
  CONSULTANT_LOGGED_IN: "consultant_logged_in",
  /** Single canonical key for Wix member MongoDB _id */
  CUSTOMER_ID: "wix_customer_id",
  CUSTOMER_EMAIL: "wix_email",
  CUSTOMER_FIRST: "wix_first_name",
  CUSTOMER_LAST: "wix_last_name",
  CUSTOMER_PHOTO: "wix_photo",
  CUSTOMER_MEMBER: "wix_member_id",
};

export const SOCKET_ROLE = {
  CUSTOMER: "customer",
  CONSULTANT: "consultant",
};

const ROLE_KEY = "wix_socket_role";

/** Old keys that duplicated the same customer id — removed on read/write */
const LEGACY_CUSTOMER_ID_KEYS = [
  "client_u_Identity",
  "wix_user_db_id",
  "user_id",
  "userId",
];

const LEGACY_CONSULTANT = ["wix_c_Identity"];

function readFirst(keys) {
  for (const key of keys) {
    const v = localStorage.getItem(key);
    if (v?.trim()) return v.trim();
  }
  return null;
}

/** One-time migration: copy first legacy value into wix_customer_id, then drop duplicates */
export function migrateLegacyCustomerId() {
  let canonical = localStorage.getItem(KEYS.CUSTOMER_ID)?.trim();
  if (canonical) {
    clearLegacyCustomerIdKeys();
    return canonical;
  }
  for (const key of LEGACY_CUSTOMER_ID_KEYS) {
    const v = localStorage.getItem(key)?.trim();
    if (v) {
      localStorage.setItem(KEYS.CUSTOMER_ID, v);
      canonical = v;
      break;
    }
  }
  clearLegacyCustomerIdKeys();
  return canonical || null;
}

export function clearLegacyCustomerIdKeys() {
  LEGACY_CUSTOMER_ID_KEYS.forEach((k) => localStorage.removeItem(k));
}

export function setSocketRole(role) {
  if (role) sessionStorage.setItem(ROLE_KEY, role);
  else sessionStorage.removeItem(ROLE_KEY);
}

export function getSocketRole() {
  return sessionStorage.getItem(ROLE_KEY);
}

export function isConsultantSession() {
  return localStorage.getItem(KEYS.CONSULTANT_LOGGED_IN) === "true";
}

export function getConsultantId() {
  return readFirst([KEYS.CONSULTANT_ID, ...LEGACY_CONSULTANT]);
}

export function getCustomerId() {
  return migrateLegacyCustomerId();
}

export function getShopId() {
  return readFirst([KEYS.SHOP_ID, "wix_id"]);
}

export function getSocketRegisterId() {
  const role = getSocketRole();
  if (role === SOCKET_ROLE.CONSULTANT) return getConsultantId();
  if (role === SOCKET_ROLE.CUSTOMER) return getCustomerId();
  if (isConsultantSession()) return getConsultantId();
  return getCustomerId();
}

export function setConsultantSession({
  id,
  shopId,
  token,
  secureUrl,
  displayName,
  displayEmail,
}) {
  if (id) {
    localStorage.setItem(KEYS.CONSULTANT_ID, String(id));
    LEGACY_CONSULTANT.forEach((k) => localStorage.removeItem(k));
  }
  if (shopId) localStorage.setItem(KEYS.SHOP_ID, String(shopId));
  if (token) localStorage.setItem(KEYS.CONSULTANT_TOKEN, token);
  if (secureUrl) localStorage.setItem("secure_url", secureUrl);
  localStorage.setItem(KEYS.CONSULTANT_LOGGED_IN, "true");
  setSocketRole(SOCKET_ROLE.CONSULTANT);
  if (displayName) localStorage.setItem("consultant_display_name", displayName);
  if (displayEmail)
    localStorage.setItem("consultant_display_email", displayEmail);
  clearCustomerSession({ keepProfile: false });
  notifySocketIdentity();
}

export function persistCustomerId(dbId, extras = {}) {
  if (!dbId) return;
  const id = String(dbId);
  setSocketRole(SOCKET_ROLE.CUSTOMER);
  localStorage.setItem(KEYS.CUSTOMER_ID, id);
  clearLegacyCustomerIdKeys();
  if (extras.email) localStorage.setItem(KEYS.CUSTOMER_EMAIL, extras.email);
  if (extras.firstName)
    localStorage.setItem(KEYS.CUSTOMER_FIRST, extras.firstName);
  if (extras.lastName)
    localStorage.setItem(KEYS.CUSTOMER_LAST, extras.lastName);
  if (extras.photo) localStorage.setItem(KEYS.CUSTOMER_PHOTO, extras.photo);
  if (extras.memberId)
    localStorage.setItem(KEYS.CUSTOMER_MEMBER, extras.memberId);
  notifySocketIdentity();
}

export function clearCustomerSession({ keepProfile = false } = {}) {
  localStorage.removeItem(KEYS.CUSTOMER_ID);
  clearLegacyCustomerIdKeys();
  if (!keepProfile) {
    localStorage.removeItem(KEYS.CUSTOMER_EMAIL);
    localStorage.removeItem(KEYS.CUSTOMER_FIRST);
    localStorage.removeItem(KEYS.CUSTOMER_LAST);
    localStorage.removeItem(KEYS.CUSTOMER_PHOTO);
    localStorage.removeItem(KEYS.CUSTOMER_MEMBER);
  }
}

export function notifySocketIdentity() {
  const userId = getSocketRegisterId();
  if (!userId) return;
  window.dispatchEvent(
    new CustomEvent("socket-identity-ready", { detail: { userId } }),
  );
}
