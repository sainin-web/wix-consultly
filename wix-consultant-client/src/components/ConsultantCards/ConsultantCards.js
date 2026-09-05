import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// bootstrap is already imported globally in index.js — no per-page import.
import "../../components/ConsultantCards/ConsultantCards.css";
import "../../css/storefront-tokens.css";
import "./StorefrontHome.css";
import { fetchConsultants } from "../Redux/slices/ConsultantSlices";
import { useDispatch, useSelector } from "react-redux";
import { KEYS, getCustomerId } from "../../utils/wixStorage";
import { ensureSocketRegistered, SOCKET_ROLE } from "../Sokect-io/SokectConfig";
import { checkUserBalance, openCallPage } from "../middle-ware/OpenCallingPage";
import { fetchVoucherData } from "../Redux/slices/UserSlices";
import { useWixUser } from "../../useContext/WixUserContext";

export const checkMicPermission = async () => {
  try {
    const result = await navigator.permissions.query({
      name: "microphone",
    });

    return result.state; // granted | denied | prompt
  } catch {
    return "prompt";
  }
};

const ICONS = {
  chat: (
    <path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  voice: (
    <path
      d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  video: (
    <>
      <path
        d="M23 7L16 12L23 17V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 5H3C1.9 5 1 5.9 1 7V17C1 18.1 1.9 19 3 19H14C15.1 19 16 18.1 16 17V7C16 5.9 15.1 5 14 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

/**
 * One consultation method (chat / audio / video).
 * `onSelect` receives the click event so the caller keeps its existing
 * stopPropagation behaviour — the surrounding card is clickable too.
 */
function ConsultationOption({ kind, label, price, onSelect }) {
  return (
    <button
      type="button"
      className="cc-option"
      onClick={onSelect}
      aria-label={`Start ${label} consultation, ${price} per minute`}
    >
      <span className="cc-option__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {ICONS[kind]}
        </svg>
      </span>
      <span className="cc-option__label">{label}</span>
      <span className="cc-option__price">{price}</span>
    </button>
  );
}

/** Availability as a labelled pill rather than a bare dot on the avatar. */
function availability({ isBusy, isActive }) {
  if (isBusy) return { modifier: "busy", text: "In session" };
  if (isActive) return { modifier: "online", text: "Available" };
  return { modifier: "offline", text: "Offline" };
}

function ConsultantCards() {
  const dispatch = useDispatch();

  const [shopId, setShopId] = useState(null);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const { consultants, loading } = useSelector((state) => state.consultants);
  const { voucherData } = useSelector((state) => state.users);
  const params = new URLSearchParams(window.location.search);
  const shop = params.get("shop");
  const shop_id = localStorage.getItem("wix_id");
  const instance = localStorage.getItem("wix_instance") || "";
  console.log("instance", instance);
  const { user, loading: wixUserLoading } = useWixUser();
  const userId = user?.wixDbId || getCustomerId();
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data.instance) {
        const instance = event.data.instance;
        fetch(`/api/get-data?instance=${instance}`)
          .then((res) => res.json())
          .then((data) => {
            console.log("Store data:", data);
          });
      }
    });
  }, []);

  console.log("instance", instance);
  useEffect(() => {
    setShopId(localStorage.getItem("wix_id"));
  }, []);

  useEffect(() => {
    // if (!instance) return;
    dispatch(fetchConsultants({ adminIdLocal: shop_id, instance }));
  }, [dispatch, instance]);
  useEffect(() => {
    if (shop_id) {
      dispatch(fetchVoucherData(shop_id));
    }
  }, [shop_id]);
  useEffect(() => {
    if (!userId || wixUserLoading) return;
    ensureSocketRegistered(userId, { role: SOCKET_ROLE.CUSTOMER });
  }, [userId, wixUserLoading]);
  const consultantsList = Array.isArray(consultants?.findConsultant)
    ? consultants.findConsultant
    : [];

  const mappedConsultants =
    consultantsList &&
    consultantsList.map((consultant) => {
      let languages = [];
      try {
        if (typeof consultant.language === "string") {
          languages = JSON.parse(consultant.language);
        } else if (Array.isArray(consultant.language)) {
          if (
            consultant.language.length > 0 &&
            typeof consultant.language[0] === "string"
          ) {
            languages = JSON.parse(consultant.language[0]);
          } else {
            languages = consultant.language;
          }
        }
        if (!Array.isArray(languages)) {
          languages = languages;
        }
      } catch (e) {
        languages = ["English"];
      }

      return {
        id: consultant._id || consultant.id,
        name: consultant.displayName || consultant.fullname || "Consultant",
        // Force https to prevent mixed-content blocking in Wix iframe
        image: consultant.profileImage
          ? consultant.profileImage.replace(/^http:\/\//i, "https://")
          : "",
        profession: consultant.profession || "Consultant",
        specialization: consultant.specialization || "",
        experience: parseInt(consultant.experience) || 0,
        shop_id: consultant.shop_id,
        languages: languages,
        rating: 4.5,
        testimonials: 0,
        isActive: consultant.isActive || false,
        chatPrice: `${voucherData?.shopCurrency || "₹"}${parseInt(consultant?.chatPerMinute) || 0}`,
        audioPrice: `${voucherData?.shopCurrency || "₹"}${parseInt(consultant?.voicePerMinute) || 0}`,
        videoPrice: `${voucherData?.shopCurrency || "₹"}${parseInt(consultant?.videoPerMinute) || 0}`,
        isBusy: consultant?.isBusy,
      };
    });

  /**
   * Start Voice Call and Video Call
   */

  const startCall = async ({ receiverId, type }) => {
    if (!userId) {
      setLoginPrompt(true);
      return;
    }
    await openCallPage({
      receiverId,
      type,
      userId,
      shop,
      storeUrl: shop_id || shop,
    });
  };

  if (initialLoading || loading) {
    return (
      <div className="consultant-home">
        <div className="page-loader">
          <div className="loader-container">
            <div className="loader-spinner"></div>
            <p className="loader-text">Loading consultants...</p>
          </div>
        </div>
      </div>
    );
  }

  const viewProfile = (shop_id, consultant_id) => {
    console.log("shop_id, consultant_id", shop_id, consultant_id);
    navigate(`/view-profile/${shop_id}/${consultant_id}`);
  };

  const viewChatsPage = async (consultantView) => {
    if (!userId) {
      setLoginPrompt(true);
      return;
    }
    const balance = await checkUserBalance({
      userId,
      consultantId: consultantView,
      type: "chat",
      shop,
    });
    console.log("balance_______________________✅", balance);
    if (balance?.requiresLogin) {
      setLoginPrompt(true);
      return;
    }
    navigate(`/chats/${consultantView}`);
  };

  const total = mappedConsultants.length;

  return (
    <div className="consultant-home">
      {loginPrompt && (
        <div
          className="cc-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cc-login-title"
        >
          <div className="cc-modal__panel">
            <div className="cc-modal__icon" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="3"
                  y="11"
                  width="18"
                  height="11"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M7 11V7a5 5 0 0 1 10 0v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2 className="cc-modal__title" id="cc-login-title">
              Login required
            </h2>
            <p className="cc-modal__text">
              You need to be logged in to start a consultation. Please log in to
              continue.
            </p>
            <div className="cc-modal__actions">
              <button
                type="button"
                className="cc-modal__btn cc-modal__btn--ghost"
                onClick={() => setLoginPrompt(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cc-modal__btn cc-modal__btn--primary"
                onClick={() => navigate("/login")}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="consultant-home__inner">
        <header className="consultant-home__intro">
          <h1 className="consultant-home__title">Find your consultant</h1>
          <p className="consultant-home__subtitle">
            Connect with experienced professionals and choose the consultation
            method that works for you.
          </p>
          {total > 0 && (
            <span className="consultant-home__count">
              {total} {total === 1 ? "consultant" : "consultants"} available
            </span>
          )}
        </header>

        {total === 0 ? (
          <div className="consultant-home__empty">
            <div className="consultant-home__empty-icon" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="9"
                  cy="7"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <p className="consultant-home__empty-title">
              No consultants available
            </p>
            <p className="consultant-home__empty-text">
              Please check back later.
            </p>
          </div>
        ) : (
          <div className="consultant-home__grid">
            {mappedConsultants.map((consultant) => {
              const shop_id = consultant.shop_id;
              const consultant_id = consultant.id;
              const status = availability(consultant);
              const languages = Array.isArray(consultant.languages)
                ? consultant.languages.join(", ")
                : String(consultant.languages || "—");

              return (
                <article
                  key={consultant.id}
                  className="cc-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => viewProfile(shop_id, consultant_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      viewProfile(shop_id, consultant_id);
                    }
                  }}
                  aria-label={`View profile of ${consultant.name}`}
                >
                  {/* Level 1 — identity */}
                  <div className="cc-card__head">
                    <div className="cc-card__avatar-wrap">
                      <img
                        src={consultant.image || "/images/flag/teamdefault.png"}
                        alt=""
                        className="cc-card__avatar"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = "/images/flag/teamdefault.png";
                        }}
                      />
                    </div>

                    <div className="cc-card__identity">
                      <h2 className="cc-card__name">{consultant.name}</h2>
                      <p className="cc-card__profession">
                        {consultant.profession}
                      </p>
                      <span
                        className={`cc-card__status cc-card__status--${status.modifier}`}
                      >
                        {status.text}
                      </span>
                    </div>
                  </div>

                  {/* Level 2 — credentials */}
                  <div className="cc-card__meta">
                    <span className="cc-card__meta-label">Experience</span>
                    <span className="cc-card__meta-label">Languages</span>
                    <span className="cc-card__meta-value">
                      {consultant.experience}+ Years
                    </span>
                    <span className="cc-card__meta-value">{languages}</span>
                  </div>

                  {/* Level 3 — consultation options */}
                  <div className="cc-card__actions">
                    <span className="cc-card__actions-label">
                      Consultation options
                    </span>
                    <div className="cc-card__options">
                      <ConsultationOption
                        kind="chat"
                        label="Chat"
                        price={consultant.chatPrice.toLocaleString()}
                        onSelect={(e) => {
                          e.stopPropagation();
                          viewChatsPage(consultant.id);
                        }}
                      />
                      <ConsultationOption
                        kind="voice"
                        label="Audio"
                        price={consultant.audioPrice.toLocaleString()}
                        onSelect={(e) => {
                          e.stopPropagation();
                          startCall({
                            receiverId: consultant.id,
                            type: "voice",
                          });
                        }}
                      />
                      <ConsultationOption
                        kind="video"
                        label="Video"
                        price={consultant.videoPrice.toLocaleString()}
                        onSelect={(e) => {
                          e.stopPropagation();
                          startCall({
                            receiverId: consultant.id,
                            type: "video",
                          });
                        }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConsultantCards;
