import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../css/storefront-tokens.css";
import "./storefront.css";
import { useDispatch, useSelector } from "react-redux";
import { fetchConsultantById } from "../Redux/slices/ConsultantSlices";
import { checkUserBalance, openCallPage } from "../middle-ware/OpenCallingPage";
import { reserveCallTab, navigateCallTab, closeReservedTab } from "../../utils/callTab";
import { fetchVoucherData } from "../Redux/slices/UserSlices";
import { useWixUser } from "../../useContext/WixUserContext";
import { getCustomerId } from "../../utils/wixStorage";
import ConsultationSelector from "./ConsultationSelector";
import { Avatar, StatusBadge, Dialog, Icon, availabilityOf, parseLanguages, splitTags } from "./Shared";

/*
 * Consultant profile page. Data + chat/call flows are the existing ones;
 * the layout is a hero band, readable content column and one selector panel.
 */
function ViewProfile() {
  const dispatch = useDispatch();
  const { user } = useWixUser();
  const userId = user?.wixDbId || getCustomerId();
  const { shop_id, consultant_id } = useParams();
  const navigate = useNavigate();

  const { consultantOverview, loading } = useSelector((state) => state.consultants);
  const { voucherData } = useSelector((state) => state.users);

  useEffect(() => {
    dispatch(fetchConsultantById({ shop_id, consultant_id }));
    dispatch(fetchVoucherData(shop_id));
  }, [dispatch, shop_id, consultant_id]);

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); }, []);

  const c = consultantOverview?.consultant;
  const [callError, setCallError] = useState("");
  const [loginPrompt, setLoginPrompt] = useState(false);

  const instanceQ = (() => {
    const instance = new URLSearchParams(window.location.search).get("instance") || localStorage.getItem("wix_instance");
    return instance ? `?instance=${encodeURIComponent(instance)}` : "";
  })();

  /* ── existing flows (unchanged apart from a login dialog instead of a silent return) ── */
  const startCall = async ({ receiverId, type }) => {
    if (!userId) { setLoginPrompt(true); return; }
    const tab = reserveCallTab("user", userId); // synchronously in the click (popup blockers)
    if (!tab) { setCallError("Your browser blocked the call window. Allow pop-ups for this site and try again."); return; }
    const result = await openCallPage({ receiverId, type, userId, shop: shop_id, storeUrl: shop_id });
    if (result?.ok) { navigateCallTab(tab, { callId: result.callId, as: "user", uid: userId }); return; }
    closeReservedTab(tab);
    if (result?.code === "login_required") { setLoginPrompt(true); return; }
    setCallError(result?.message || "Call could not be started. Please try again.");
  };

  const startChat = async (consultantId) => {
    if (!userId) { setLoginPrompt(true); return; }
    const balance = await checkUserBalance({ userId, consultantId, type: "chat", shop: shop_id });
    if (balance?.requiresLogin) { setLoginPrompt(true); return; }
    navigate(`/chats/${consultantId}${instanceQ}`);
  };

  const backToHome = () => navigate(`/consultant/card${instanceQ}`);

  const onStart = (kind) => {
    if (!c?._id) return;
    if (kind === "chat") startChat(c._id);
    else startCall({ receiverId: c._id, type: kind });
  };

  /* ── derived display data ─────────────────────────────────── */
  const currency = voucherData?.shopCurrency || "";
  const name = c?.displayName || c?.fullname || "Consultant";
  const languages = useMemo(() => parseLanguages(c?.language), [c]);
  const tags = useMemo(() => splitTags(c?.specialization), [c]);
  const status = availabilityOf({ isBusy: c?.isBusy, isActive: c?.isActive });
  const prices = {
    chat: `${currency}${parseInt(c?.chatPerMinute, 10) || 0}`,
    voice: `${currency}${parseInt(c?.voicePerMinute, 10) || 0}`,
    video: `${currency}${parseInt(c?.videoPerMinute, 10) || 0}`,
  };
  const bio = String(c?.bio || "").trim();
  const paragraphs = bio ? bio.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean) : [];

  if (loading || !c) {
    return (
      <div className="sf-profile">
        <div className="sf-profile__inner">
          <div className="sf-skeleton-row"><span /><span /></div>
          <div className="sf-hero sf-hero--skeleton" aria-busy="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="sf-profile">
      {loginPrompt && (
        <Dialog
          labelledBy="sf-vp-login"
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
          labelledBy="sf-vp-call-err"
          title="Unable to start the call"
          text={callError}
          actions={<button type="button" className="sf-btn sf-btn--primary" onClick={() => setCallError("")}>OK</button>}
        />
      )}

      <div className="sf-profile__inner">
        <button type="button" className="sf-back" onClick={backToHome}>
          <Icon name="back" size={16} /> All consultants
        </button>

        {/* Hero band: who is this? */}
        <section className="sf-hero" aria-label="Consultant">
          <Avatar src={c.profileImage} name={name} size={96} status={status.key} className="sf-hero__avatar" />
          <div className="sf-hero__body">
            <div className="sf-hero__line">
              <h1 className="sf-hero__name">{name}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="sf-hero__role">{c.profession || "Consultant"}{c.specialization ? ` · ${c.specialization}` : ""}</p>
            <ul className="sf-hero__facts">
              <li><Icon name="briefcase" size={15} /><span><strong>{parseInt(c.experience, 10) || 0}+ years</strong> of experience</span></li>
              {languages.length > 0 && <li><Icon name="globe" size={15} /><span>Speaks <strong>{languages.join(", ")}</strong></span></li>}
              <li><Icon name="chat" size={15} /><span>Chat, audio and video</span></li>
            </ul>
          </div>
        </section>

        <div className="sf-profile__cols">
          {/* Content column: plain typography, no boxes */}
          <div className="sf-profile__main">
            <section className="sf-section">
              <h2 className="sf-section__title">About</h2>
              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => <p key={i} className="sf-prose">{p}</p>)
              ) : (
                <p className="sf-prose sf-prose--muted">{name} has not added a biography yet.</p>
              )}
            </section>

            {tags.length > 0 && (
              <section className="sf-section">
                <h2 className="sf-section__title">Expertise</h2>
                <div className="sf-tags">{tags.map((t) => <span key={t} className="sf-tag sf-tag--lg">{t}</span>)}</div>
              </section>
            )}

            <section className="sf-section">
              <h2 className="sf-section__title">How it works</h2>
              <ol className="sf-steps">
                <li><span>1</span><div><strong>Choose a format</strong><p>Chat, audio or video, priced per minute.</p></div></li>
                <li><span>2</span><div><strong>Send your request</strong><p>The consultant accepts and you're connected.</p></div></li>
                <li><span>3</span><div><strong>Pay as you go</strong><p>Time is billed from your wallet only while connected.</p></div></li>
              </ol>
            </section>
          </div>

          {/* The one panel on the page */}
          <div className="sf-profile__side">
            <ConsultationSelector prices={prices} status={status} signedIn={Boolean(userId)} onStart={onStart} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewProfile;
