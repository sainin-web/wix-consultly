import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import styles from "./ProfileSection.module.css";
import "../../css/storefront-tokens.css";
import {
  fetchUserDetailsByIds,
  fetchVoucherData,
} from "../Redux/slices/UserSlices";
import { useWixUser } from "../../useContext/WixUserContext";
import { getDuration } from "../Helper/Helper";

/*
 * Customer "My Profile" page.
 *
 * Identity comes from WixUserContext (populated by the widget's
 * getCurrentMember() → /api/wix-user-session → wixDbId). Every request below
 * is keyed on that wixDbId; nothing here reads an arbitrary localStorage id.
 *
 * Data sources (all pre-existing endpoints — no backend changes):
 *   GET /api/users/shopify/users/:userId              user record + walletBalance
 *   GET /api/users/get/vouchers/:shopId               shop currency + purchasable packs
 *   GET /api/users/get/wallet-history/:userId/:shopId credits/debits (voucher purchases)
 *   GET /api/users/find-user-logs-history/:userId     chat / voice / video sessions
 *
 * Tabs are local state, not nested routes, so the URL stays /profile?instance=…
 * and the Wix instance is never dropped by a NavLink.
 *
 * Height: no fixed heights anywhere. The shell's ResizeObserver picks up tab
 * switches, list loads and empty states on its own.
 */

const BACKEND = process.env.REACT_APP_BACKEND_HOST;
const DEFAULT_AVATAR = "/images/flag/teamdefault.png";
const log = (...args) => console.log("[PROFILE]", ...args);

const TYPE_META = {
  chat: { label: "Chat", icon: "chat" },
  voice: { label: "Audio", icon: "voice" },
  video: { label: "Video", icon: "video" },
};

const CREDIT_TYPES = new Set(["recharge", "bonus", "credit", "manual_credit", "refund"]);

const ICONS = {
  chat: (
    <path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  ),
  voice: (
    <path
      d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  ),
  video: (
    <>
      <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 5H3C1.9 5 1 5.9 1 7V17C1 18.1 1.9 19 3 19H14C15.1 19 16 18.1 16 17V7C16 5.9 15.1 5 14 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2M16 13h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  ticket: (
    <path
      d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
    />
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function money(currency, value) {
  const n = Number(value) || 0;
  return `${currency || ""}${n.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (["completed", "ended", "success", "paid"].includes(s)) return "ok";
  if (["active", "pending", "ongoing"].includes(s)) return "warn";
  if (["failed", "missed", "cancelled", "rejected"].includes(s)) return "bad";
  return "neutral";
}

function EmptyState({ icon, title, text }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}><Icon name={icon} /></div>
      <p className={styles.emptyTitle}>{title}</p>
      {text && <p className={styles.emptyText}>{text}</p>}
    </div>
  );
}

function Skeleton({ rows = 3 }) {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.skeletonRow} />
      ))}
    </div>
  );
}

/* ── Guest ──────────────────────────────────────────────────── */

function SignedOut() {
  return (
    <div className={styles.page}>
      <div className={styles.signedOut}>
        <div className={styles.signedOutIcon}><Icon name="lock" size={20} /></div>
        <h1 className={styles.signedOutTitle}>Sign in to view your profile</h1>
        <p className={styles.signedOutText}>
          Log in with your site account to see your consultations, wallet and
          vouchers. Use the account menu at the top of the page, then come back
          here.
        </p>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => {
            log("Guest pressed refresh — re-checking Wix member");
            window.location.reload();
          }}
        >
          I&rsquo;ve signed in &mdash; refresh
        </button>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

const ProfileSection = () => {
  const dispatch = useDispatch();
  const { user, loading: wixLoading } = useWixUser();
  const { userDetails, voucherData } = useSelector((state) => state.users);

  const userId = user?.wixDbId || null;
  const shopId = (() => {
    try { return localStorage.getItem("wix_id"); } catch { return null; }
  })();

  const [tab, setTab] = useState("consultations");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sessions, setSessions] = useState([]);
  const [sessionsState, setSessionsState] = useState("idle"); // idle|loading|ready|error
  const [wallet, setWallet] = useState([]);
  const [walletState, setWalletState] = useState("idle");

  useEffect(() => { log("Route opened"); }, []);

  useEffect(() => {
    if (wixLoading) return;
    if (userId) log("Wix user context resolved — userId found", userId);
    else log("Wix user context resolved — guest");
  }, [wixLoading, userId]);

  useEffect(() => {
    if (shopId) log("Instance / shop resolved", shopId);
  }, [shopId]);

  // Profile record (fullname, email, walletBalance) — existing thunk
  useEffect(() => {
    if (!userId) return;
    log("Fetching profile data");
    dispatch(fetchUserDetailsByIds(userId));
  }, [dispatch, userId]);

  useEffect(() => {
    if (userDetails?.data) log("Profile data loaded");
  }, [userDetails]);

  // Shop currency + purchasable packs — existing thunk
  useEffect(() => {
    if (!shopId || !userId) return;
    dispatch(fetchVoucherData(shopId));
  }, [dispatch, shopId, userId]);

  useEffect(() => {
    if (voucherData) log("Voucher data loaded", { packs: voucherData?.vouchers?.length ?? 0 });
  }, [voucherData]);

  // Consultation history — existing customer endpoint
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setSessionsState("loading");
    axios
      .get(`${BACKEND}/api/users/find-user-logs-history/${userId}`)
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setSessions(rows);
        setSessionsState("ready");
        log("Consultation history loaded", { count: rows.length });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[PROFILE] Consultation history failed:", err.message);
        setSessions([]);
        setSessionsState("error");
      });
    return () => { cancelled = true; };
  }, [userId]);

  // Wallet history (voucher purchases + usage) — existing customer endpoint
  useEffect(() => {
    if (!userId || !shopId) return;
    let cancelled = false;
    setWalletState("loading");
    axios
      .get(`${BACKEND}/api/users/get/wallet-history/${userId}/${shopId}`)
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setWallet(rows);
        setWalletState("ready");
        log("Wallet history loaded", { count: rows.length });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[PROFILE] Wallet history failed:", err.message);
        setWallet([]);
        setWalletState("error");
      });
    return () => { cancelled = true; };
  }, [userId, shopId]);

  // Purchase flow — unchanged from the previous Voucher page
  const buyVoucher = useCallback(async (voucher) => {
    const voucherAdminId = voucherData?.id;
    if (!voucherAdminId) return;
    try {
      const response = await axios.post(
        `${BACKEND}/api/buy-voucher/${voucherAdminId}`,
        { wixProductId: voucher?.wixProductId },
      );
      if (response.status === 200) {
        window.open(response.data?.data?.productPageUrl, "_blank");
      }
    } catch (error) {
      console.error("[PROFILE] buy-voucher failed:", error.message);
    }
  }, [voucherData]);

  /* ── Derived ─────────────────────────────────────────────── */

  const record = userDetails?.data || null;
  const currency = voucherData?.shopCurrency || "";
  const balance = record?.walletBalance ?? 0;

  const displayName = useMemo(() => {
    const fromWix = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return fromWix || record?.fullname || "Member";
  }, [user, record]);

  const email = user?.email || record?.email || "";
  const avatar = user?.photo || record?.profileImage || DEFAULT_AVATAR;

  // Per-type usage from real session records. There are no separate
  // chat/audio/video credit buckets in the schema — the wallet is a single
  // balance — so these tiles show what has been spent on each channel.
  const usage = useMemo(() => {
    const acc = {
      chat: { count: 0, amount: 0 },
      voice: { count: 0, amount: 0 },
      video: { count: 0, amount: 0 },
    };
    for (const s of sessions) {
      const t = acc[s.type];
      if (!t) continue;
      t.count += 1;
      t.amount += Number(s.amount) || 0;
    }
    return acc;
  }, [sessions]);

  const visibleSessions = useMemo(
    () => (typeFilter === "all" ? sessions : sessions.filter((s) => s.type === typeFilter)),
    [sessions, typeFilter],
  );

  const purchases = useMemo(
    () => wallet.filter((w) => CREDIT_TYPES.has(w.transactionType) || w.direction === "credit"),
    [wallet],
  );

  /* ── Render ──────────────────────────────────────────────── */

  if (wixLoading) {
    return (
      <div className={`customer-profile ${styles.page}`}>
        <Skeleton rows={4} />
      </div>
    );
  }

  if (!userId) {
    return <div className="customer-profile"><SignedOut /></div>;
  }

  return (
    <div className={`customer-profile ${styles.page}`}>
      <header className={styles.intro}>
        <h1 className={styles.title}>My Profile</h1>
        <p className={styles.subtitle}>Manage your consultations, wallet and vouchers.</p>
      </header>

      {/* Identity + wallet ─────────────────────────────────── */}
      <div className={styles.topGrid}>
        <section className={styles.card} aria-label="Account">
          <div className={styles.identity}>
            <img
              src={avatar}
              alt=""
              className={styles.avatar}
              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
            />
            <div className={styles.identityText}>
              <h2 className={styles.name}>{displayName}</h2>
              {email ? (
                <p className={styles.email}>{email}</p>
              ) : (
                <p className={styles.emailMuted}>No email on file</p>
              )}
              <span className={styles.pill}>Site member</span>
            </div>
          </div>
        </section>

        <section className={styles.walletGrid} aria-label="Wallet">
          <div className={`${styles.tile} ${styles.tileBalance}`}>
            <div className={styles.tileHead}>
              <span className={styles.tileIcon}><Icon name="wallet" /></span>
              <span className={styles.tileLabel}>Wallet balance</span>
            </div>
            <div className={styles.tileValue}>{money(currency, balance)}</div>
            <button type="button" className={styles.tileAction} onClick={() => setTab("vouchers")}>
              Add credits
            </button>
          </div>

          {Object.entries(TYPE_META).map(([key, meta]) => (
            <div key={key} className={styles.tile}>
              <div className={styles.tileHead}>
                <span className={styles.tileIcon}><Icon name={meta.icon} /></span>
                <span className={styles.tileLabel}>{meta.label} spent</span>
              </div>
              <div className={styles.tileValue}>
                {sessionsState === "loading" ? "…" : money(currency, usage[key].amount)}
              </div>
              <div className={styles.tileFoot}>
                {sessionsState === "loading"
                  ? "Loading"
                  : `${usage[key].count} ${usage[key].count === 1 ? "session" : "sessions"}`}
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Tabs ──────────────────────────────────────────────── */}
      <div className={styles.tabs} role="tablist" aria-label="Profile sections">
        {[
          ["consultations", "Consultations"],
          ["vouchers", "Vouchers & Wallet"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Consultations ─────────────────────────────────────── */}
      {tab === "consultations" && (
        <section className={styles.card} role="tabpanel">
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Consultation history</h3>
            <div className={styles.chips} aria-label="Filter by type">
              {[["all", "All"], ["chat", "Chat"], ["voice", "Audio"], ["video", "Video"]].map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  className={`${styles.chip} ${typeFilter === k ? styles.chipActive : ""}`}
                  aria-pressed={typeFilter === k}
                  onClick={() => setTypeFilter(k)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {sessionsState === "loading" && <Skeleton />}
          {sessionsState === "error" && (
            <EmptyState icon="chat" title="Could not load your history" text="Please try again in a moment." />
          )}
          {sessionsState === "ready" && visibleSessions.length === 0 && (
            <EmptyState
              icon="chat"
              title={
                typeFilter === "all"
                  ? "No consultations yet"
                  : `No ${TYPE_META[typeFilter]?.label.toLowerCase()} consultations yet`
              }
              text="Sessions you start with a consultant will appear here."
            />
          )}
          {sessionsState === "ready" && visibleSessions.length > 0 && (
            <ul className={styles.list}>
              {visibleSessions.map((s) => {
                const meta = TYPE_META[s.type] || { label: s.type || "Session", icon: "chat" };
                const consultantName = s.consultant?.fullname || s.consultant?.email || "Consultant";
                const duration =
                  s.startTime && s.endTime ? `${getDuration(s.startTime, s.endTime)} min` : "—";
                return (
                  <li key={s._id} className={styles.row}>
                    <span className={styles.rowIcon}><Icon name={meta.icon} /></span>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>{consultantName}</span>
                      <span className={styles.rowSub}>
                        {meta.label} consultation · {formatDateTime(s.createdAt || s.startTime)}
                      </span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span className={styles.rowMetaItem}>
                        <span className={styles.rowMetaLabel}>Duration</span>
                        {duration}
                      </span>
                      <span className={styles.rowMetaItem}>
                        <span className={styles.rowMetaLabel}>Amount</span>
                        {money(currency, s.amount)}
                      </span>
                      <span className={`${styles.status} ${styles[`status_${statusTone(s.status)}`]}`}>
                        {s.status || "—"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Vouchers & wallet ─────────────────────────────────── */}
      {tab === "vouchers" && (
        <div className={styles.stack} role="tabpanel">
          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>Add credits</h3>
              <span className={styles.sectionHint}>Balance {money(currency, balance)}</span>
            </div>
            {!voucherData ? (
              <Skeleton rows={1} />
            ) : (voucherData.vouchers || []).length === 0 ? (
              <EmptyState icon="ticket" title="No packs available" text="The store has not published any credit packs yet." />
            ) : (
              <div className={styles.packGrid}>
                {voucherData.vouchers.map((v) => {
                  const base = Number(v.totalCoin) || 0;
                  const extra = Number(v.extraCoin) || 0;
                  return (
                    <button
                      key={v._id}
                      type="button"
                      className={styles.pack}
                      onClick={() => buyVoucher(v)}
                      aria-label={`Buy ${currency}${base} pack${extra ? ` with ${currency}${extra} extra` : ""}`}
                    >
                      {extra > 0 && <span className={styles.packBadge}>+{currency}{extra} bonus</span>}
                      <span className={styles.packAmount}>{currency}{base}</span>
                      <span className={styles.packTotal}>You get {currency}{base + extra}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>My vouchers</h3>
              <span className={styles.sectionHint}>Purchases and credits</span>
            </div>
            {walletState === "loading" && <Skeleton />}
            {walletState === "error" && (
              <EmptyState icon="ticket" title="Could not load your vouchers" text="Please try again in a moment." />
            )}
            {walletState === "ready" && purchases.length === 0 && (
              <EmptyState icon="ticket" title="No vouchers yet" text="Purchase a credit pack above to start consulting." />
            )}
            {walletState === "ready" && purchases.length > 0 && (
              <ul className={styles.list}>
                {purchases.map((w) => (
                  <li key={w._id} className={styles.row}>
                    <span className={styles.rowIcon}><Icon name="ticket" /></span>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {w.description || `${w.transactionType || "credit"} · ${money(w.currency || currency, w.amount)}`}
                      </span>
                      <span className={styles.rowSub}>
                        {formatDate(w.createdAt)}
                        {w.draftOrderId ? ` · Order ${w.draftOrderId}` : ""}
                      </span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span className={styles.rowMetaItem}>
                        <span className={styles.rowMetaLabel}>Credits</span>
                        +{money(w.currency || currency, w.amount)}
                      </span>
                      <span className={`${styles.status} ${styles[`status_${statusTone(w.status)}`]}`}>
                        {w.status || w.direction || "—"}
                      </span>
                      {w.invoiceUrl && (
                        <a className={styles.link} href={w.invoiceUrl} target="_blank" rel="noreferrer">
                          Invoice
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ProfileSection;
