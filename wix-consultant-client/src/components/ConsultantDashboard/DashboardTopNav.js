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
 * The one consultant navigation bar: identity | tabs | actions.
 *
 * Tabs fold into the "More" menu from the right as the viewport narrows
 * (collapseClass on each item) instead of wrapping. The More menu closes on
 * outside click and Escape, and lives in normal flow so it works inside the
 * Wix iframe. The identity block opens the profile modal.
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

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
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
      <button
        type="button"
        className={styles.identity}
        onClick={onOpenProfile}
        title="My profile"
      >
        <img
          className={styles.avatar}
          src={imageUrl || "/images/flag/teamdefault.png"}
          alt=""
          onError={(e) => {
            e.currentTarget.src = "/images/flag/teamdefault.png";
          }}
        />
        <span className={styles.identityText}>
          <span className={styles.name}>{displayName || "Consultant"}</span>
          <span className={styles.welcome}>Consultant</span>
        </span>
      </button>

      <nav className={styles.tabs} aria-label="Dashboard">
        {items.map((item) => (
          <button
            key={item.path}
            type="button"
            title={item.label}
            aria-current={item.active ? "page" : undefined}
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
                  className={`${styles.menuItem} ${item.active ? styles.menuItemActive : ""}`}
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
                My profile
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
                View storefront
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
                Log out
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
          <HiOutlineGlobeAlt />
          <span>View storefront</span>
        </button>
        <button
          type="button"
          className={`${styles.ghostBtn} ${styles.logoutBtn}`}
          onClick={onLogout}
          title="Log out"
        >
          <HiOutlineArrowLeftOnRectangle />
          <span>Log out</span>
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
