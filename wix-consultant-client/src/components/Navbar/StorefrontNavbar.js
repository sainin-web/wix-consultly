import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/storefront-tokens.css";
import "./StorefrontNavbar.css";

/**
 * Compact application navigation for the storefront widget. The Wix site
 * already has its own header above this, so this bar is deliberately light:
 * a small wordmark, three links, an underline for the active page.
 *
 * Rendered once by StorefrontShell; hidden on consultant-dashboard routes.
 */
function StorefrontNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const instance = localStorage.getItem("wix_instance");
  const q = instance ? `?instance=${instance}` : "";

  const navItems = [
    { label: "Home", path: `/consultant/card${q}`, match: ["/consultant/card", "/view-profile"] },
    { label: "My Profile", path: `/profile${q}`, match: ["/profile"] },
    { label: "Consultant Login", path: `/login${q}`, match: ["/login"] },
  ];

  return (
    <nav className="storefront-nav" aria-label="Consultly">
      <button type="button" className="storefront-nav__brand" onClick={() => navigate(navItems[0].path)} aria-label="Consultly home">
        <span className="storefront-nav__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v6a3.5 3.5 0 0 1-3.5 3.5H11l-4.4 3.3a.6.6 0 0 1-1-.48V16A3.5 3.5 0 0 1 4 12.5v-6Z" fill="currentColor" />
          </svg>
        </span>
        <span className="storefront-nav__word">Consultly</span>
      </button>

      <div className="storefront-nav__links" role="list">
        {navItems.map((item) => {
          const active = item.match.some((m) => location.pathname.startsWith(m));
          return (
            <button
              key={item.path}
              type="button"
              role="listitem"
              onClick={() => navigate(item.path)}
              className={`storefront-nav__link${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default StorefrontNavbar;
