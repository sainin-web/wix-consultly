import { NavMenu } from "@shopify/app-bridge-react";
import { useAppBridge } from "../components/createContext/AppBridgeContext";

export function AdminMenu() {
  const app = useAppBridge();
  if (!app) {
    console.warn(
      "⚠️ AdminMenu: App Bridge not initialized, NavMenu will not render",
    );
    return null;
  }

  return (
    <NavMenu>
      {/* First link must have rel="home" and href="/" for home route */}
      <a href="/" rel="home">
        Dashboard{" "}
      </a>
      <a href="/consultant-list">Consultant List</a>
      <a href="/admin-percentage">Admin Charges</a>
      <a href="/voucher-management">Voucher Management</a>
      <a href="/history"> Activity History</a>
      <a href="/wallet-management">Wallet Management</a>
      <a href="/withdrawal-request">Withdrawal Request</a>
      <a href="/revenue-management">Revenue Management</a>
      <a href="/account-information">Account Info</a>
      <a href="/faq">FAQ</a>
    </NavMenu>
  );
}
