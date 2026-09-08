import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/storefront-tokens.css";
import "./storefront.css";
import { fetchConsultants } from "../Redux/slices/ConsultantSlices";
import { useDispatch, useSelector } from "react-redux";
import { getCustomerId } from "../../utils/wixStorage";
import { ensureSocketRegistered, SOCKET_ROLE } from "../Sokect-io/SokectConfig";
import { checkUserBalance, openCallPage } from "../middle-ware/OpenCallingPage";
import { reserveCallTab, navigateCallTab, closeReservedTab } from "../../utils/callTab";
import { fetchVoucherData } from "../Redux/slices/UserSlices";
import { useWixUser } from "../../useContext/WixUserContext";
import ConsultantCard from "./ConsultantCard";
import { Dialog, Icon, availabilityOf, parseLanguages, splitTags } from "./Shared";

/* Kept: other modules import this helper from here. */
export const checkMicPermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: "microphone" });
    return result.state; // granted | denied | prompt
  } catch {
    return "prompt";
  }
};

/*
 * Consultant listing (storefront home).
 * Data, sockets, chat/call starters and navigation are unchanged from the
 * previous implementation; only the presentation is new.
 */
function ConsultantCards() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loginPrompt, setLoginPrompt] = useState(false);
  const [callError, setCallError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | online | <profession>
  const { consultants, loading } = useSelector((state) => state.consultants);
  const { voucherData } = useSelector((state) => state.users);
  const params = new URLSearchParams(window.location.search);
  const shop = params.get("shop");
  const shop_id = localStorage.getItem("wix_id");
  const instance = localStorage.getItem("wix_instance") || "";
  const { user, loading: wixUserLoading } = useWixUser();
  const userId = user?.wixDbId || getCustomerId();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    dispatch(fetchConsultants({ adminIdLocal: shop_id, instance }));
  }, [dispatch, instance]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (shop_id) dispatch(fetchVoucherData(shop_id));
  }, [shop_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!userId || wixUserLoading) return;
    ensureSocketRegistered(userId, { role: SOCKET_ROLE.CUSTOMER });
  }, [userId, wixUserLoading]);

  const currency = voucherData?.shopCurrency || "₹";
  const consultantsList = useMemo(() => (Array.isArray(consultants?.findConsultant) ? consultants.findConsultant : []), [consultants]);

  const mapped = useMemo(() => consultantsList.map((c) => ({
    id: c._id || c.id,
    name: c.displayName || c.fullname || "Consultant",
    image: c.profileImage ? String(c.profileImage).replace(/^http:\/\//i, "https://") : "",
    profession: c.profession || "Consultant",
    specialization: c.specialization || "",
    tags: splitTags(c.specialization),
    experience: parseInt(c.experience, 10) || 0,
    shop_id: c.shop_id,
    languages: parseLanguages(c.language),
    isActive: Boolean(c.isActive),
    isBusy: Boolean(c.isBusy),
    chatPrice: `${currency}${parseInt(c?.chatPerMinute, 10) || 0}`,
    audioPrice: `${currency}${parseInt(c?.voicePerMinute, 10) || 0}`,
    videoPrice: `${currency}${parseInt(c?.videoPerMinute, 10) || 0}`,
  })), [consultantsList, currency]);

  const professions = useMemo(() => {
    const counts = new Map();
    mapped.forEach((c) => counts.set(c.profession, (counts.get(c.profession) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p]) => p);
  }, [mapped]);

  const availableCount = mapped.filter((c) => c.isActive && !c.isBusy).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mapped
      .filter((c) => (filter === "all" ? true : filter === "online" ? c.isActive && !c.isBusy : c.profession === filter))
      .filter((c) => !q || [c.name, c.profession, c.specialization, ...c.languages].join(" ").toLowerCase().includes(q))
      // available first, then busy, then offline
      .sort((a, b) => rank(a) - rank(b));
  }, [mapped, filter, query]);

  /* ── existing flows (unchanged) ─────────────────────────── */
  const startCall = async ({ receiverId, type }) => {
    if (!userId) { setLoginPrompt(true); return; }
    // Reserve the call tab synchronously (popup blockers), then ask the server.
    const tab = reserveCallTab("user", userId);
    if (!tab) { setCallError("Your browser blocked the call window. Allow pop-ups for this site and try again."); return; }
    const result = await openCallPage({ receiverId, type, userId, shop, storeUrl: shop_id || shop });
    if (result?.ok) { navigateCallTab(tab, { callId: result.callId, as: "user", uid: userId }); return; }
    closeReservedTab(tab);
    if (result?.code === "login_required") { setLoginPrompt(true); return; }
    setCallError(result?.message || "Call could not be started. Please try again.");
  };

  const viewProfile = (consultant) => navigate(`/view-profile/${consultant.shop_id}/${consultant.id}`);

  const viewChatsPage = async (consultantView) => {
    if (!userId) { setLoginPrompt(true); return; }
    const balance = await checkUserBalance({ userId, consultantId: consultantView, type: "chat", shop });
    if (balance?.requiresLogin) { setLoginPrompt(true); return; }
    navigate(`/chats/${consultantView}`);
  };

  const onService = (consultant, kind) => {
    if (kind === "chat") viewChatsPage(consultant.id);
    else startCall({ receiverId: consultant.id, type: kind });
  };

  /* ── render ─────────────────────────────────────────────── */
  if (initialLoading || loading) {
    return (
      <div className="sf-home">
        <div className="sf-home__inner">
          <div className="sf-skeleton-row"><span /><span /></div>
          <div className="sf-grid" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="sf-card sf-card--skeleton" />)}
          </div>
        </div>
      </div>
    );
  }

  const total = mapped.length;

  return (
    <div className="sf-home">
      {loginPrompt && (
        <Dialog
          labelledBy="sf-login-title"
          icon="lock"
          title="Sign in to continue"
          text="You need to be logged in to start a consultation. Please log in and try again."
          actions={<>
            <button type="button" className="sf-btn sf-btn--ghost" onClick={() => setLoginPrompt(false)}>Cancel</button>
            <button type="button" className="sf-btn sf-btn--primary" onClick={() => navigate("/login")}>Login</button>
          </>}
        />
      )}
      {callError && (
        <Dialog
          labelledBy="sf-call-err"
          title="Unable to start the call"
          text={callError}
          actions={<button type="button" className="sf-btn sf-btn--primary" onClick={() => setCallError("")}>OK</button>}
        />
      )}

      <div className="sf-home__inner">
        {/* Intro: heading + stats + search. No box. */}
        <header className="sf-intro">
          <div className="sf-intro__text">
            <h1 className="sf-intro__title">Find the right expert for you</h1>
            <p className="sf-intro__lead">Connect with trusted professionals and get advice through chat, audio or video consultation.</p>
          </div>
          {total > 0 && (
            <dl className="sf-intro__stats" aria-label="Consultant summary">
              <div><dt>Experts</dt><dd>{total}</dd></div>
              <div><dt>Available now</dt><dd className="sf-intro__stat--live">{availableCount}</dd></div>
            </dl>
          )}
        </header>

        {total > 0 && (
          <div className="sf-toolbar">
            <label className="sf-search">
              <Icon name="search" size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, profession or language"
                aria-label="Search consultants"
              />
            </label>
            <div className="sf-chips" role="group" aria-label="Filter consultants">
              <button type="button" className={`sf-chip${filter === "all" ? " is-on" : ""}`} onClick={() => setFilter("all")}>All</button>
              <button type="button" className={`sf-chip${filter === "online" ? " is-on" : ""}`} onClick={() => setFilter("online")}>
                <span className="sf-chip__dot" aria-hidden="true" />Available now
              </button>
              {professions.length > 1 && professions.map((p) => (
                <button key={p} type="button" className={`sf-chip${filter === p ? " is-on" : ""}`} onClick={() => setFilter(filter === p ? "all" : p)}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {total === 0 ? (
          <div className="sf-empty">
            <span className="sf-empty__icon"><Icon name="users" size={20} /></span>
            <p className="sf-empty__title">No consultants yet</p>
            <p className="sf-empty__text">The site owner has not added any consultants. Please check back later.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="sf-empty">
            <span className="sf-empty__icon"><Icon name="search" size={20} /></span>
            <p className="sf-empty__title">No matches</p>
            <p className="sf-empty__text">Try a different search or clear the filter.</p>
            <button type="button" className="sf-btn sf-btn--ghost" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button>
          </div>
        ) : (
          <div className="sf-grid">
            {visible.map((c) => (
              <ConsultantCard key={c.id} consultant={c} status={availabilityOf(c)} onOpen={viewProfile} onService={onService} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const rank = (c) => (c.isBusy ? 1 : c.isActive ? 0 : 2);

export default ConsultantCards;
