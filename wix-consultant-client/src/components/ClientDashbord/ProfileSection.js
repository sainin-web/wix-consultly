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
const PENDING_KEY = "consultly_pending_purchase";
const PAGE_SIZE = 10;

/** Compact server-side pager: "1–10 of 42" + Prev / Next. Hidden for a single page. */
function Pager({ meta, onPage, busy }) {
  if (!meta || meta.totalPages <= 1) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.total, meta.page * meta.limit);
  return (
    <nav className={styles.pager} aria-label="Pagination">
      <span className={styles.pagerInfo}>{from}–{to} of {meta.total}</span>
      <div className={styles.pagerBtns}>
        <button type="button" className={styles.pagerBtn} onClick={() => onPage(meta.page - 1)} disabled={busy || meta.page <= 1} aria-label="Previous page">‹ Prev</button>
        <span className={styles.pagerPage}>{meta.page} / {meta.totalPages}</span>
        <button type="button" className={styles.pagerBtn} onClick={() => onPage(meta.page + 1)} disabled={busy || !meta.hasMore} aria-label="Next page">Next ›</button>
      </div>
    </nav>
  );
}
const POLL_MS = 3000;
const POLL_MAX_MS = 30 * 60 * 1000;

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

/* ── Voucher store (Buy now → Wix checkout → webhook → credits) ─ */

const authHeaders = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

function purchaseTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID") return "ok";
  if (s === "PENDING" || s === "PROCESSING") return "warn";
  if (s === "FAILED" || s === "CANCELLED" || s === "EXPIRED") return "bad";
  return "neutral";
}

/**
 * Credit packs + purchase flow. The backend is the only authority:
 *   Buy now → POST /api/vouchers/purchase { voucherId }  (price/credits from DB)
 *   → Wix checkout opens in a NEW TOP-LEVEL TAB (reserved synchronously in the click)
 *   → this panel polls GET /api/vouchers/purchase/:id until the Wix webhook
 *     marks it PAID (credits added server-side) / FAILED / CANCELLED.
 * Nothing here ever adds credits or trusts a redirect.
 */
function VoucherStore({ token, voucherData, currency, balance, walletRows, walletState, walletMeta, onWalletPage, onWalletChanged }) {
  const [flow, setFlow] = useState({ state: "idle" }); // idle|creating|awaiting|paid|failed|cancelled|error
  const [history, setHistory] = useState([]);
  const [historyMeta, setHistoryMeta] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyState, setHistoryState] = useState("idle");
  const pollRef = React.useRef(null);
  const tabRef = React.useRef(null);

  const loadHistory = useCallback(async (page = historyPage) => {
    if (!token) { setHistoryState("noauth"); return; }
    setHistoryState((s) => (s === "ready" ? s : "loading"));
    try {
      const { data } = await axios.get(`${BACKEND}/api/vouchers/purchases`, { ...authHeaders(token), params: { page, limit: PAGE_SIZE } });
      setHistory(Array.isArray(data?.purchases) ? data.purchases : []);
      setHistoryMeta(data?.pagination || null);
      setHistoryState("ready");
    } catch (err) {
      console.error("[VOUCHER] history failed:", err.response?.data?.message || err.message);
      setHistoryState(err.response?.status === 401 ? "noauth" : "error");
    }
  }, [token, historyPage]);

  useEffect(() => { loadHistory(historyPage); }, [loadHistory, historyPage]);

  const stopPolling = useCallback(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }, []);

  const settle = useCallback((purchase) => {
    stopPolling();
    try { localStorage.removeItem(PENDING_KEY); } catch (e) { /* ignore */ }
    if (purchase.status === "PAID") {
      log("Purchase PAID — credits confirmed by server", purchase.purchaseId);
      setFlow({ state: "paid", purchase });
      onWalletChanged();
    } else if (purchase.status === "FAILED") {
      setFlow({ state: "failed", purchase });
    } else {
      setFlow({ state: "cancelled", purchase });
    }
    setHistoryPage(1);
    loadHistory(1);
  }, [stopPolling, onWalletChanged, loadHistory]);

  const startPolling = useCallback((purchaseId, checkoutUrl, startedAt = Date.now()) => {
    stopPolling();
    setFlow({ state: "awaiting", purchaseId, checkoutUrl, since: startedAt });
    const tick = async () => {
      try {
        const { data } = await axios.get(`${BACKEND}/api/vouchers/purchase/${purchaseId}`, authHeaders(token));
        const p = data?.purchase;
        if (!p) return;
        if (["PAID", "FAILED", "CANCELLED", "EXPIRED"].includes(p.status)) { settle(p); return; }
        if (Date.now() - startedAt > POLL_MAX_MS) { stopPolling(); setFlow((f) => ({ ...f, state: "awaiting", stale: true })); }
      } catch (err) {
        if (err.response?.status === 404 || err.response?.status === 401) { stopPolling(); try { localStorage.removeItem(PENDING_KEY); } catch (e) { /* ignore */ } setFlow({ state: "idle" }); }
      }
    };
    tick();
    pollRef.current = setInterval(tick, POLL_MS);
  }, [stopPolling, settle, token]);

  // Refresh / return from checkout: resume waiting for the pending purchase.
  useEffect(() => {
    if (!token) return;
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.purchaseId) { log("Resuming pending purchase", saved.purchaseId); startPolling(saved.purchaseId, saved.checkoutUrl, saved.since || Date.now()); }
    } catch (e) { /* ignore */ }
    return stopPolling;
  }, [token, startPolling, stopPolling]);

  const buy = async (voucher) => {
    if (flow.state === "creating") return;
    if (!token) { setFlow({ state: "error", message: "Your sign-in needs to be refreshed before buying. Please reload the page and try again." }); return; }
    // Reserve the checkout tab synchronously inside the click (popup blockers);
    // Wix checkout must run top-level, never inside this embedded section.
    let tab = null;
    try { tab = window.open("about:blank", "consultly_checkout"); } catch (e) { tab = null; }
    setFlow({ state: "creating", voucherId: voucher._id });
    log("Buy now", voucher._id);
    try {
      const { data } = await axios.post(`${BACKEND}/api/vouchers/purchase`, { voucherId: voucher._id }, authHeaders(token));
      if (!data?.success || !data.checkoutUrl) throw new Error(data?.message || "Checkout could not be created");
      try { localStorage.setItem(PENDING_KEY, JSON.stringify({ purchaseId: data.purchaseId, checkoutUrl: data.checkoutUrl, since: Date.now() })); } catch (e) { /* ignore */ }
      if (tab && !tab.closed) { tab.location.href = data.checkoutUrl; tabRef.current = tab; try { tab.focus(); } catch (e) { /* ignore */ } }
      startPolling(data.purchaseId, data.checkoutUrl);
      if (!tab) setFlow((f) => ({ ...f, popupBlocked: true }));
    } catch (err) {
      try { tab?.close(); } catch (e) { /* ignore */ }
      const body = err.response?.data || {};
      console.error("[VOUCHER] purchase failed:", body.code || err.message);
      setFlow({ state: "error", message: body.message || "We could not start the checkout. Please try again." });
    }
  };

  const reopen = () => {
    if (!flow.checkoutUrl) return;
    const w = window.open(flow.checkoutUrl, "consultly_checkout");
    if (w) { tabRef.current = w; try { w.focus(); } catch (e) { /* ignore */ } setFlow((f) => ({ ...f, popupBlocked: false })); }
  };

  const cancel = async () => {
    if (!flow.purchaseId) return;
    stopPolling();
    try { tabRef.current?.close(); } catch (e) { /* ignore */ }
    try {
      const { data } = await axios.post(`${BACKEND}/api/vouchers/purchase/${flow.purchaseId}/cancel`, {}, authHeaders(token));
      settle(data?.purchase || { status: "CANCELLED" });
    } catch (err) {
      settle({ status: "CANCELLED" });
    }
  };

  const packs = voucherData?.vouchers || [];
  const otherCredits = (walletRows || []).filter((w) => (CREDIT_TYPES.has(w.transactionType) || w.direction === "credit") && w.transactionType !== "voucher_purchase");
  const busy = flow.state === "creating" || flow.state === "awaiting";

  return (
    <div className={styles.stack} role="tabpanel">
      {/* Flow status panel */}
      {flow.state !== "idle" && (
        <section className={`${styles.card} ${styles.flowCard} ${styles[`flow_${flow.state}`] || ""}`} aria-live="polite">
          {flow.state === "creating" && (<><div className={styles.flowTitle}><span className={styles.spinner} /> Preparing secure checkout…</div><p className={styles.flowText}>You will be taken to the store checkout in a new tab.</p></>)}
          {flow.state === "awaiting" && (
            <>
              <div className={styles.flowTitle}><span className={styles.spinner} /> {flow.stale ? "Still waiting for payment" : "Waiting for payment confirmation"}</div>
              <p className={styles.flowText}>
                {flow.popupBlocked
                  ? "Your browser blocked the checkout tab. Open it with the button below."
                  : "Complete your payment in the checkout tab. Credits are added automatically once the store confirms the payment — this can take a few seconds after you return."}
              </p>
              <div className={styles.flowActions}>
                <button type="button" className={styles.btnPrimary} onClick={reopen}>{flow.popupBlocked ? "Open checkout" : "Open checkout again"}</button>
                <button type="button" className={styles.btnGhost} onClick={cancel}>Cancel purchase</button>
              </div>
            </>
          )}
          {flow.state === "paid" && (<><div className={styles.flowTitle}>Payment confirmed</div><p className={styles.flowText}>{flow.purchase?.credits ? `${money(currency, flow.purchase.credits)} in credits` : "Your credits"} have been added to your wallet.</p><div className={styles.flowActions}><button type="button" className={styles.btnGhost} onClick={() => setFlow({ state: "idle" })}>Done</button></div></>)}
          {flow.state === "failed" && (<><div className={styles.flowTitle}>Payment failed</div><p className={styles.flowText}>The store reported that the payment was declined or cancelled. No credits were added and you were not charged.</p><div className={styles.flowActions}><button type="button" className={styles.btnGhost} onClick={() => setFlow({ state: "idle" })}>Close</button></div></>)}
          {flow.state === "cancelled" && (<><div className={styles.flowTitle}>Purchase cancelled</div><p className={styles.flowText}>No credits were added. If you did complete a payment, your credits will still appear once the store confirms it.</p><div className={styles.flowActions}><button type="button" className={styles.btnGhost} onClick={() => setFlow({ state: "idle" })}>Close</button></div></>)}
          {flow.state === "error" && (<><div className={styles.flowTitle}>Could not start checkout</div><p className={styles.flowText}>{flow.message}</p><div className={styles.flowActions}><button type="button" className={styles.btnGhost} onClick={() => setFlow({ state: "idle" })}>Close</button></div></>)}
        </section>
      )}

      {/* Packs */}
      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>Available credit packages</h3>
          <span className={styles.sectionHint}>Balance {money(currency, balance)}</span>
        </div>
        {!voucherData ? (
          <Skeleton rows={1} />
        ) : packs.length === 0 ? (
          <EmptyState icon="ticket" title="No packs available" text="The store has not published any credit packs yet." />
        ) : (
          <div className={styles.packGrid}>
            {packs.map((v) => {
              const base = Number(v.totalCoin) || 0;
              const extra = Number(v.extraCoin) || 0;
              const price = Number(v.price) || base;
              const name = v.name || `${money(currency, base)} pack`;
              const creating = flow.state === "creating" && flow.voucherId === v._id;
              return (
                <div key={v._id} className={styles.pack}>
                  {extra > 0 && <span className={styles.packBadge}>+{money(currency, extra)} bonus</span>}
                  <span className={styles.packName}>{name}</span>
                  <span className={styles.packAmount}>{money(currency, base + extra)}</span>
                  <span className={styles.packTotal}>credits</span>
                  <span className={styles.packPrice}>{money(currency, price)}</span>
                  <button type="button" className={styles.packBuy} onClick={() => buy(v)} disabled={busy} aria-label={`Buy ${name} for ${money(currency, price)}`}>
                    {creating ? "Preparing…" : "Buy now"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {!token && voucherData && packs.length > 0 && (
          <p className={styles.noteMuted}>Purchases need a verified sign-in. If “Buy now” does not work, reload the page.</p>
        )}
      </section>

      {/* Purchase history */}
      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>Voucher purchase history</h3>
          <span className={styles.sectionHint}>Confirmed by the store</span>
        </div>
        {historyState === "loading" && <Skeleton />}
        {historyState === "noauth" && <EmptyState icon="lock" title="Sign in to see your purchases" text="Reload the page to refresh your session." />}
        {historyState === "error" && <EmptyState icon="ticket" title="Could not load your purchases" text="Please try again in a moment." />}
        {historyState === "ready" && history.length === 0 && <EmptyState icon="ticket" title="No purchases yet" text="Buy a credit pack above to start consulting." />}
        {historyState === "ready" && history.length > 0 && (
          <ul className={styles.list}>
            {history.map((p) => (
              <li key={p.purchaseId} className={styles.row}>
                <span className={styles.rowIcon}><Icon name="ticket" /></span>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{p.voucher?.name || "Credit pack"}</span>
                  <span className={styles.rowSub}>
                    {formatDateTime(p.paidAt || p.createdAt)}
                    {p.wixOrderNumber ? ` · Order #${p.wixOrderNumber}` : ""}
                    {` · ${p.purchaseId}`}
                  </span>
                </div>
                <div className={styles.rowMeta}>
                  <span className={styles.rowMetaItem}><span className={styles.rowMetaLabel}>Credits</span>{money(currency, p.credits)}</span>
                  <span className={styles.rowMetaItem}><span className={styles.rowMetaLabel}>Paid</span>{money(p.currency || currency, p.amount)}</span>
                  <span className={`${styles.status} ${styles[`status_${purchaseTone(p.status)}`]}`}>{p.status === "PAID" ? "Paid" : p.status.charAt(0) + p.status.slice(1).toLowerCase()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {historyState === "ready" && <Pager meta={historyMeta} onPage={setHistoryPage} />}
      </section>

      {/* Other wallet credits (manual/bonus) — only when any exist */}
      {walletState === "ready" && otherCredits.length > 0 && (
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Other wallet credits</h3>
            <span className={styles.sectionHint}>Bonuses and adjustments</span>
          </div>
          <ul className={styles.list}>
            {otherCredits.map((w) => (
              <li key={w._id} className={styles.row}>
                <span className={styles.rowIcon}><Icon name="wallet" /></span>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{w.description || w.transactionType}</span>
                  <span className={styles.rowSub}>{formatDate(w.createdAt)}</span>
                </div>
                <div className={styles.rowMeta}>
                  <span className={styles.rowMetaItem}><span className={styles.rowMetaLabel}>Credits</span>+{money(w.currency || currency, w.amount)}</span>
                  <span className={`${styles.status} ${styles[`status_${statusTone(w.status)}`]}`}>{w.status || w.direction || "—"}</span>
                </div>
              </li>
            ))}
          </ul>
          <Pager meta={walletMeta} onPage={onWalletPage} />
        </section>
      )}
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
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsMeta, setSessionsMeta] = useState(null);
  const [usageSummary, setUsageSummary] = useState(null);
  const [walletPage, setWalletPage] = useState(1);
  const [walletMeta, setWalletMeta] = useState(null);
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
      .get(`${BACKEND}/api/users/find-user-logs-history/${userId}`, { params: { page: sessionsPage, limit: PAGE_SIZE, ...(typeFilter !== "all" ? { type: typeFilter } : {}) } })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setSessions(rows);
        setSessionsMeta(res.data?.pagination || null);
        if (res.data?.summary) setUsageSummary(res.data.summary);
        setSessionsState("ready");
        log("Consultation history loaded", { page: sessionsPage, count: rows.length, total: res.data?.pagination?.total });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[PROFILE] Consultation history failed:", err.message);
        setSessions([]);
        setSessionsState("error");
      });
    return () => { cancelled = true; };
  }, [userId, sessionsPage, typeFilter]);

  const [walletTick, setWalletTick] = useState(0);
  const refreshWallet = useCallback(() => {
    if (userId) dispatch(fetchUserDetailsByIds(userId));
    setWalletTick((n) => n + 1);
  }, [dispatch, userId]);

  // Wallet history (voucher purchases + usage) — existing customer endpoint
  useEffect(() => {
    if (!userId || !shopId) return;
    let cancelled = false;
    setWalletState("loading");
    axios
      .get(`${BACKEND}/api/users/get/wallet-history/${userId}/${shopId}`, { params: { kind: "credits", page: walletPage, limit: PAGE_SIZE } })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setWallet(rows);
        setWalletMeta(res.data?.pagination || null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, shopId, walletTick, walletPage]);

  // Purchases live in <VoucherStore/> (server-verified Wix checkout + webhook).

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
  // Totals come from the server (aggregated over every session), so they do
  // not depend on which page is loaded.
  const usage = useMemo(() => usageSummary || {
    chat: { count: 0, amount: 0 },
    voice: { count: 0, amount: 0 },
    video: { count: 0, amount: 0 },
  }, [usageSummary]);

  // Filtering is server-side now (type param); the page holds one filtered page.
  const visibleSessions = sessions;



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
                  onClick={() => { setTypeFilter(k); setSessionsPage(1); }}
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
          {sessionsState === "ready" && <Pager meta={sessionsMeta} onPage={setSessionsPage} />}
        </section>
      )}

      {/* Vouchers & wallet ─────────────────────────────────── */}
      {tab === "vouchers" && (
        <VoucherStore
          token={user?.token || ""}
          voucherData={voucherData}
          currency={currency}
          balance={balance}
          walletRows={wallet}
          walletState={walletState}
          walletMeta={walletMeta}
          onWalletPage={setWalletPage}
          onWalletChanged={refreshWallet}
        />
      )}
    </div>
  );
};

export default ProfileSection;
