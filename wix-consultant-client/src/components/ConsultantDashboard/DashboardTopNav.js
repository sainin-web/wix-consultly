import { useEffect, useRef, useState } from "react";
import {
  HiOutlineSquares2X2,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentList,
  HiOutlineBanknotes,
  HiOutlineArrowDownTray,
  HiOutlineEllipsisHorizontal,
  HiOutlineUser,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineGlobeAlt,
} from "react-icons/hi2";
import styles from "./DashboardTopNav.module.css";

/**
 * Compact horizontal navigation for the consultant dashboard.
 *
 * Replaces the old fixed-position sidebar, which did not work inside the Wix
 * storefront iframe. Tabs collapse into a "More" menu at narrow widths rather
 * than wrapping onto extra rows.
 *
 * Tab order matters: `collapseClass` hides tabs right-to-left as width shrinks,
 * so the least-used tabs move into the More menu first.
 */
export default function DashboardTopNav({
  items,
  onNavigate,
  onOpenProfile,
  onViewStorefront,
  onLogout,
  displayName,
  imageUrl,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the More menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const go = (path) => {
    setMenuOpen(false);
    onNavigate(path);
  };

  return (
    <div className={styles.bar}>
      <div className={styles.identity}>
        <img
          className={styles.avatar}
          src={imageUrl || "/images/flag/teamdefault.png"}
          alt={displayName || "Consultant"}
        />
        <div className={styles.identityText}>
          <span className={styles.welcome}>Welcome</span>
          <span className={styles.name}>{displayName || "Consultant"}</span>
        </div>
      </div>

      <nav className={styles.tabs}>
        {items.map((item) => (
          <button
            key={item.path}
            type="button"
            title={item.label}
            onClick={() => go(item.path)}
            className={[
              styles.tab,
              item.active ? styles.tabActive : "",
              item.collapseClass ? styles[item.collapseClass] : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className={styles.tabIcon}>{item.icon}</span>
            <span>{item.shortLabel || item.label}</span>
          </button>
        ))}

        <div className={styles.moreWrap} ref={menuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More"
            onClick={() => setMenuOpen((v) => !v)}
            className={`${styles.tab} ${menuOpen ? styles.moreOpen : ""}`}
          >
            <span className={styles.tabIcon}>
              <HiOutlineEllipsisHorizontal />
            </span>
            <span>More</span>
          </button>

          {menuOpen && (
            <div className={styles.menu} role="menu">
              {items.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  role="menuitem"
                  onClick={() => go(item.path)}
                  className={`${styles.menuItem} ${
                    item.active ? styles.menuItemActive : ""
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}

              <div className={styles.menuDivider} />

              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onOpenProfile();
                }}
              >
                <HiOutlineUser />
                My Profile
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onViewStorefront();
                }}
              >
                <HiOutlineGlobeAlt />
                View Storefront
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${styles.menuItem} ${styles.dangerItem}`}
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                <HiOutlineArrowLeftOnRectangle />
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.ghostBtn} ${styles.storefrontBtn}`}
          onClick={onViewStorefront}
          title="Browse the public storefront without logging out"
        >
          View Storefront
        </button>
        <button type="button" className={styles.ghostBtn} onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

/** Icons exported so TabNavigation can build the item list without duplicating imports. */
export const NAV_ICONS = {
  dashboard: <HiOutlineSquares2X2 />,
  chats: <HiOutlineChatBubbleLeftRight />,
  callLogs: <HiOutlineClipboardDocumentList />,
  wallet: <HiOutlineBanknotes />,
  withdrawals: <HiOutlineArrowDownTray />,
};
