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
  HiOutlineBell,
  HiOutlinePhoneXMark,
} from "react-icons/hi2";
import styles from "./DashboardTopNav.module.css";

/**
 * The one consultant navigation bar: identity | tabs | bell + actions.
 *
 * Tabs fold into the "More" menu from the right as the viewport narrows
 * (collapseClass on each item) instead of wrapping. Menus close on outside
 * click and Escape, and live in normal flow so they work inside the Wix iframe.
 */
function useDismissable(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);
  return ref;
}

function timeAgo(at) {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardTopNav({
  items,
  onNavigate,
  onOpenProfile,
  onViewStorefront,
  onLogout,
  displayName,
  imageUrl,
  notifications = [],
  onOpenNotification,
  onMarkAllRead,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useDismissable(menuOpen, setMenuOpen);
  const bellRef = useDismissable(bellOpen, setBellOpen);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const go = (path) => {
    setMenuOpen(false);
    onNavigate(path);
  };

  return (
    <div className={styles.bar}>
      <button type="button" className={styles.identity} onClick={onOpenProfile} title="My profile">
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
              <button type="button" role="menuitem" className={styles.menuItem} onClick={() => { setMenuOpen(false); onOpenProfile(); }}>
                <HiOutlineUser />
                My profile
              </button>
              <button type="button" role="menuitem" className={styles.menuItem} onClick={() => { setMenuOpen(false); onViewStorefront(); }}>
                <HiOutlineGlobeAlt />
                View storefront
              </button>
              <button type="button" role="menuitem" className={`${styles.menuItem} ${styles.dangerItem}`} onClick={() => { setMenuOpen(false); onLogout(); }}>
                <HiOutlineArrowLeftOnRectangle />
                Log out
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className={styles.actions}>
        {/* ── Notifications ── */}
        <div className={styles.bellWrap} ref={bellRef}>
          <button
            type="button"
            className={`${styles.bellBtn} ${bellOpen ? styles.bellOpen : ""}`}
            aria-label={unreadCount ? `${unreadCount} new notifications` : "Notifications"}
            aria-haspopup="menu"
            aria-expanded={bellOpen}
            onClick={() => setBellOpen((v) => !v)}
          >
            <HiOutlineBell />
            {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>

          {bellOpen && (
            <div className={styles.bellMenu} role="menu" aria-label="Notifications">
              <div className={styles.bellHead}>
                <span>Notifications</span>
                {notifications.length > 0 && (
                  <button type="button" className={styles.bellLink} onClick={onMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className={styles.bellEmpty}>No notifications yet.</div>
              ) : (
                <ul className={styles.bellList}>
                  {notifications.slice(0, 12).map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        role="menuitem"
                        className={`${styles.bellItem} ${n.read ? "" : styles.bellItemUnread}`}
                        onClick={() => {
                          setBellOpen(false);
                          onOpenNotification?.(n);
                        }}
                      >
                        <span className={`${styles.bellIcon} ${n.type === "missed_call" ? styles.bellIconCall : ""}`} aria-hidden="true">
                          {n.type === "missed_call" ? <HiOutlinePhoneXMark /> : <HiOutlineChatBubbleLeftRight />}
                        </span>
                        <span className={styles.bellBody}>
                          <span className={styles.bellTitle}>{n.title}</span>
                          <span className={styles.bellText}>{n.text}</span>
                          <span className={styles.bellTime}>{timeAgo(n.at)}</span>
                        </span>
                        {!n.read && <span className={styles.bellDot} aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className={`${styles.ghostBtn} ${styles.storefrontBtn}`}
          onClick={onViewStorefront}
          title="Browse the public storefront without logging out"
        >
          <HiOutlineGlobeAlt />
          <span>View storefront</span>
        </button>
        <button type="button" className={`${styles.ghostBtn} ${styles.logoutBtn}`} onClick={onLogout} title="Log out">
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
