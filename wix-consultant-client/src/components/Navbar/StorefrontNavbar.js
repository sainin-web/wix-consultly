import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/storefront-tokens.css";
import "./StorefrontNavbar.css";

/**
 * The single public storefront navigation. Rendered once, by
 * StorefrontShell, and hidden on consultant-dashboard routes.
 *
 * Presentation lives in StorefrontNavbar.css — the previous inline
 * `styles` object was removed so the storefront has one styling system.
 */
function StorefrontNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const instance = localStorage.getItem("wix_instance");
  const q = instance ? `?instance=${instance}` : "";

  const isActive = (path) => location.pathname.startsWith(path);

  const navItems = [
    { label: "Home", path: `/consultant/card${q}` },
    { label: "My Profile", path: `/profile${q}` },
    { label: "Consultant Login", path: `/login${q}` },
  ];

  return (
    <nav className="storefront-nav" aria-label="Consultation">
      <span className="storefront-nav__brand">
        <span className="storefront-nav__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        Consultations
      </span>

      <div className="storefront-nav__links">
        {navItems.map((item) => {
          const active = isActive(item.path.split("?")[0]);
          return (
            <button
              key={item.path}
              type="button"
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
