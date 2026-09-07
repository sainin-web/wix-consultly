import { Outlet, useLocation } from "react-router-dom";
import WixInstanceGuard from "./WixInstanceGuard";
import ProtectStoreFront from "./ProtectStoreFront";
import StorefrontNavbar from "../Navbar/StorefrontNavbar";
import ActiveCallGate from "../AlertModel/ActiveCallGate";

/**
 * Route prefixes that run in "consultant mode". Inside these, the public
 * storefront navigation (Home / My Profile / Consultant Login) is hidden —
 * the consultant navigates via the dashboard's own tabs instead.
 *
 * Every consultant dashboard page is a child route of /consultant-dashboard
 * (chats, call-chat-logs, consultant-wallet-logs, withdrawal-request,
 * withdrawal-request-table), so this single prefix covers all of them.
 */
const CONSULTANT_ROUTE_PREFIXES = ["/consultant-dashboard"];

export function isConsultantRoute(pathname) {
  return CONSULTANT_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Wix storefront iframe routes: instance guard + app-enabled check + navbar shell.
 * Uses Outlet so nested consultant-dashboard routes render correctly.
 *
 * `showNavbar` can force the public navbar off for a specific route; by default
 * visibility is derived from the current path, so it stays correct after a refresh.
 */
export default function StorefrontShell({
  children,
  className = "iframe-page-shell",
  showNavbar,
}) {
  const { pathname } = useLocation();
  const consultantMode = isConsultantRoute(pathname);
  const renderNavbar = showNavbar ?? !consultantMode;

  return (
    <WixInstanceGuard>
      <ProtectStoreFront>
        <div className={className}>
          {renderNavbar && <StorefrontNavbar />}
          {!consultantMode && <ActiveCallGate />}
          {children || <Outlet />}
        </div>
      </ProtectStoreFront>
    </WixInstanceGuard>
  );
}
