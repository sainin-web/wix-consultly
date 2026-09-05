import React, { useCallback, useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Popover, ActionList } from "@shopify/polaris";
import "bootstrap-icons/font/bootstrap-icons.css";
import { fetchAdminDetails } from "../components/Redux/slices/adminSlice";

/**
 * The single admin shell: sidebar + topbar + <Outlet/>.
 * Styled by src/css/saas-theme.css only. The same sidebar component serves
 * desktop (collapsible) and mobile (slide-in drawer) — no second navigation.
 */

const menuSections = [
  {
    heading: "Overview",
    items: [
      { path: "/admin", icon: "bi-grid-1x2", label: "Dashboard", end: true },
      { path: "/admin/consultant-list", icon: "bi-people", label: "Consultants" },
      { path: "/admin/history", icon: "bi-clock-history", label: "History" },
    ],
  },
  {
    heading: "Finance",
    items: [
      { path: "/admin/wallet-management", icon: "bi-wallet2", label: "Wallet Management" },
      { path: "/admin/withdrawal-request", icon: "bi-cash-stack", label: "Withdrawal Requests" },
      { path: "/admin/voucher-management", icon: "bi-ticket-perforated", label: "Voucher Management" },
      { path: "/admin/admin-percentage", icon: "bi-percent", label: "Admin Charges" },
      { path: "/admin/revenue-management", icon: "bi-graph-up-arrow", label: "Revenue" },
    ],
  },
  {
    heading: "Settings",
    items: [
      { path: "/admin/account-information", icon: "bi-person-gear", label: "Account" },
      { path: "/admin/faq", icon: "bi-question-circle", label: "FAQ" },
    ],
  },
];

function findSection(pathname) {
  for (const section of menuSections) {
    for (const item of section.items) {
      const match = item.end ? pathname === item.path : pathname.startsWith(item.path);
      if (match) return section.heading;
    }
  }
  return menuSections[0].heading;
}

const LayoutBigCommerce = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { adminDetails_ } = useSelector((state) => state.admin);

  // Admin identity for the topbar. Pages fetch this too; only fetch here when
  // nothing has loaded it yet so the shell never issues a duplicate request.
  useEffect(() => {
    if (adminDetails_) return;
    const adminIdLocal = localStorage.getItem("wix_id");
    const token = localStorage.getItem("wix_access_token") || "";
    if (adminIdLocal) dispatch(fetchAdminDetails({ adminIdLocal, token }));
  }, [adminDetails_, dispatch]);

  const adminName = adminDetails_?.shop_Domain || "Store admin";
  const adminInitial = adminName.trim().charAt(0).toUpperCase() || "A";
  const sectionLabel = findSection(location.pathname);

  const handleSidebarToggle = useCallback(() => {
    if (window.innerWidth < 992) setIsMobileMenuOpen((prev) => !prev);
    else setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    if (window.innerWidth < 992) setIsMobileMenuOpen(false);
  }, []);

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <div
      className={`dashboard-frame-root${isSidebarCollapsed ? " dashboard-frame-root--collapsed" : ""}`}
    >
      {!isMobileMenuOpen && (
        <button
          type="button"
          className="dashboard-mobile-toggle-btn d-lg-none"
          aria-label="Open navigation"
          onClick={handleSidebarToggle}
        >
          <i className="bi bi-list" />
        </button>
      )}

      {isMobileMenuOpen && (
        <div className="saas-mobile-backdrop d-lg-none" onClick={closeMobileMenu} aria-hidden="true" />
      )}

      <aside
        className={`dashboard-sidebar${isSidebarCollapsed ? " dashboard-sidebar--collapsed" : ""}${
          isMobileMenuOpen ? " dashboard-sidebar--mobile-open" : ""
        }`}
      >
        <div className="dashboard-sidebar-branding">
          <div className="saas-brand">
            <span className="dashboard-sidebar-logo" aria-hidden="true">
              <i className="bi bi-chat-square-text-fill" />
            </span>
            <span className="dashboard-sidebar-logo-text">Consultly</span>
          </div>
          <button
            type="button"
            className="dashboard-sidebar-toggle"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={handleSidebarToggle}
          >
            <i className={`bi ${isSidebarCollapsed ? "bi-chevron-right" : "bi-chevron-left"}`} />
          </button>
        </div>

        <nav className="saas-sidebar-scroll" aria-label="Admin navigation">
          {menuSections.map((section) => (
            <div className="saas-nav-section" key={section.heading}>
              <p className="saas-nav-heading">{section.heading}</p>
              <ul className="dashboard-sidebar-nav">
                {section.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                      title={isSidebarCollapsed ? item.label : undefined}
                      onClick={closeMobileMenu}
                    >
                      <span className="dashboard-sidebar-icon">
                        <i className={`bi ${item.icon}`} />
                      </span>
                      <span className="saas-nav-label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="dashboard-main-wrap">
        <header className="saas-topbar">
          <p className="saas-topbar-breadcrumb">
            <span>Admin</span>
            <i className="bi bi-chevron-right" aria-hidden="true" />
            <span className="saas-topbar-crumb-current">{sectionLabel}</span>
          </p>

          <div className="saas-topbar-right">
            <Popover
              active={menuOpen}
              onClose={() => setMenuOpen(false)}
              preferredAlignment="right"
              activator={
                <button
                  type="button"
                  className="saas-admin-btn"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <span className="saas-topbar-avatar" aria-hidden="true">
                    {adminInitial}
                  </span>
                  <span className="saas-admin-meta">
                    <span className="saas-admin-name">{adminName}</span>
                    <span className="saas-admin-role">Store owner</span>
                  </span>
                  <i className="bi bi-chevron-down" aria-hidden="true" />
                </button>
              }
            >
              <ActionList
                actionRole="menuitem"
                items={[
                  { content: "Account information", onAction: () => go("/admin/account-information") },
                  { content: "Help & FAQ", onAction: () => go("/admin/faq") },
                ]}
              />
            </Popover>
          </div>
        </header>

        <main className="dashboard-content">
          <div className="saas-page-enter" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default LayoutBigCommerce;
