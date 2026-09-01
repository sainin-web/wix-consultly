import React, { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";

const menuSections = [
  {
    heading: "Overview",
    items: [
      { path: "/admin", icon: "bi-grid-1x2", label: "Dashboard", end: true },
      {
        path: "/admin/consultant-list",
        icon: "bi-people",
        label: "Consulty List",
      },
      { path: "/admin/history", icon: "bi-clock-history", label: "History" },
    ],
  },
  {
    heading: "Finance",
    items: [
      {
        path: "/admin/wallet-management",
        icon: "bi-wallet2",
        label: "Wallet Management",
      },
      {
        path: "/admin/withdrawal-request",
        icon: "bi-cash-stack",
        label: "Withdrawal Request",
      },
      {
        path: "/admin/voucher-management",
        icon: "bi-ticket-perforated",
        label: "Voucher Management",
      },
      {
        path: "/admin/admin-percentage",
        icon: "bi-percent",
        label: "Admin Charges",
      },
      {
        path: "/admin/revenue-management",
        icon: "bi-graph-up-arrow",
        label: "Revenue Management",
      },
    ],
  },
  {
    heading: "Settings",
    items: [
      {
        path: "/admin/account-information",
        icon: "bi-person-gear",
        label: "Account Information",
      },
      { path: "/admin/faq", icon: "bi-question-circle", label: "FAQ" },
    ],
  },
];

// Flat list used to resolve the current page title for the topbar
const allMenuItems = menuSections.flatMap((s) => s.items);

const LayoutBigCommerce = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const currentItem =
    allMenuItems.find(
      (item) =>
        item.path !== "/admin" && location.pathname.startsWith(item.path),
    ) || allMenuItems[0];

  const handleDesktopSidebarToggle = () => {
    const isMobile = window.innerWidth < 992;

    if (isMobile) {
      setIsMobileMenuOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const closeMobileMenu = () => {
    if (window.innerWidth < 992) setIsMobileMenuOpen(false);
  };

  return (
    <div
      className={`d-flex dashboard-frame-root${
        isSidebarCollapsed ? " dashboard-frame-root--collapsed" : ""
      }`}
    >
      {/* Mobile open button (shown when drawer is hidden) */}
      {!isMobileMenuOpen && (
        <button
          type="button"
          className="dashboard-mobile-toggle-btn d-lg-none"
          aria-label="Open sidebar"
          onClick={handleDesktopSidebarToggle}
        >
          <i className="bi bi-list" />
        </button>
      )}

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="saas-mobile-backdrop d-lg-none"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`d-flex flex-column flex-shrink-0 dashboard-sidebar${
          isSidebarCollapsed ? " dashboard-sidebar--collapsed" : ""
        }${isMobileMenuOpen ? " dashboard-sidebar--mobile-open" : ""}`}
      >
        {/* Brand + toggle */}
        <div className="dashboard-sidebar-branding">
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="dashboard-sidebar-logo">
                <i className="bi bi-stars" />
              </span>
              <span className="dashboard-sidebar-logo-text">Consulty</span>
            </div>
            <button
              type="button"
              className="dashboard-sidebar-toggle"
              aria-label="Toggle sidebar"
              onClick={handleDesktopSidebarToggle}
            >
              <i
                className={`bi ${
                  isSidebarCollapsed ? "bi-chevron-right" : "bi-chevron-left"
                }`}
              />
            </button>
          </div>
          <div className="saas-workspace-label">
            <span className="saas-workspace-name">Admin Workspace</span>
            <span className="saas-env-badge">Live</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="saas-sidebar-scroll" aria-label="Admin navigation">
          {menuSections.map((section) => (
            <div className="saas-nav-section" key={section.heading}>
              <p className="saas-nav-heading">{section.heading}</p>
              <ul
                className={`nav flex-column dashboard-sidebar-nav${
                  isMobileMenuOpen ? " is-open" : ""
                }`}
              >
                {section.items.map((item) => (
                  <li className="nav-item" key={item.label}>
                    <NavLink
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) =>
                        `nav-link${isActive ? " active" : ""}`
                      }
                      title={isSidebarCollapsed ? item.label : undefined}
                      onClick={closeMobileMenu}
                    >
                      <span className="dashboard-sidebar-icon">
                        <i className={`bi ${item.icon}`} />
                      </span>
                      <span className="saas-nav-label">{item.label}</span>
                      <span className="saas-nav-indicator" aria-hidden="true" />
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

      
      </aside>

      {/* Main content area */}
      <div className="flex-grow-1 d-flex flex-column dashboard-main-wrap">
        {/* Topbar */}
        <header className="saas-topbar">
          <div className="saas-topbar-left">
            <p className="saas-topbar-breadcrumb">
              <span className="saas-topbar-crumb-root">Admin</span>
              <i className="bi bi-chevron-right" />
              <span className="saas-topbar-crumb-current">
                {currentItem.label}
              </span>
            </p>
          </div>

          <div className="saas-topbar-search" role="search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search anything…"
              aria-label="Search"
            />
            <span className="saas-topbar-kbd" aria-hidden="true">
              ⌘K
            </span>
          </div>

          <div className="saas-topbar-right">
            <button
              type="button"
              className="saas-topbar-icon-btn"
              aria-label="Notifications"
            >
              <i className="bi bi-bell" />
              <span className="saas-topbar-dot" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="saas-topbar-icon-btn"
              aria-label="Help"
            >
              <i className="bi bi-question-circle" />
            </button>
            <span className="saas-topbar-divider" aria-hidden="true" />
            <span className="saas-topbar-avatar" aria-label="Admin profile">
              A
            </span>
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
