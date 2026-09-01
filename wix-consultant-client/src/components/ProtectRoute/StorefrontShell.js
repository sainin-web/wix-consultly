import { Outlet } from "react-router-dom";
import WixInstanceGuard from "./WixInstanceGuard";
import ProtectStoreFront from "./ProtectStoreFront";
import StorefrontNavbar from "../Navbar/StorefrontNavbar";

/**
 * Wix storefront iframe routes: instance guard + app-enabled check + navbar shell.
 * Uses Outlet so nested consultant-dashboard routes render correctly.
 */
export default function StorefrontShell({
  children,
  className = "iframe-page-shell",
}) {
  return (
    <WixInstanceGuard>
      <ProtectStoreFront>
        <div className={className}>
          <StorefrontNavbar />
          {children || <Outlet />}
        </div>
      </ProtectStoreFront>
    </WixInstanceGuard>
  );
}
