/** Paths where admin appEnabled toggle blocks the UI */
export const STOREFRONT_PATH_PREFIXES = [
  "/consultant/card",
  "/view-profile",
  "/profile",
  "/login",
  "/chats",
  "/video/calling",
  "/consultant-dashboard",
];

export function isStorefrontPath(pathname = "") {
  return STOREFRONT_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
}
