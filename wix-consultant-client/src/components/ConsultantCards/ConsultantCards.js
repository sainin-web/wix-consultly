import React, { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../components/ConsultantCards/ConsultantCards.css";
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
      <div className="consultant-cards-page">
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

  return (
    <div className="consultant-cards-page">
      {loginPrompt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "36px 32px",
              maxWidth: 380,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <h2
              style={{ margin: "0 0 8px", fontSize: "1.3rem", color: "#111" }}
            >
              Login Required
            </h2>
            <p style={{ color: "#666", marginBottom: 24, fontSize: "0.95rem" }}>
              You cannot access this feature without logging in. Please login
              first.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => navigate("/login")}
                style={{
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 24px",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Login
              </button>
              <button
                onClick={() => setLoginPrompt(false)}
                style={{
                  background: "#f3f4f6",
                  color: "#444",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 24px",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="container py-4 flex justify-content-center align-items-center">
        <div
          className="row"
          style={{ gap: "1.5rem", margin: "10px", width: "100%" }}
        >
          {mappedConsultants.length === 0 ? (
            <div className="col-12 text-center py-5">
              <p>No consultants found.</p>
            </div>
          ) : (
            mappedConsultants.map((consultant) => {
              const shop_id = consultant.shop_id;
              const consultant_id = consultant.id;
              console.log("shop_id", shop_id);
              return (
                <div
                  key={consultant.id}
                  className="col-lg-3 col-md-6 col-sm-12 "
                  style={{ boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)" }}
                >
                  <div
                    className="card shadow-sm border-0 consultant-card"
                    // onClick={() => navigate(`/view-profile/${shop_id}/${consultant_id}`)}
                    onClick={() => viewProfile(shop_id, consultant_id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="card-body p-4">
                      {/* Profile Section */}
                      <div className="flex align-items-start mb-3">
                        {/* Profile Image */}
                        <div className="me-3 position-relative flex-shrink-0">
                          <img
                            src={
                              consultant.image || "/images/flag/teamdefault.png"
                            }
                            alt={consultant.name}
                            className="rounded-circle profile-image"
                            onError={(e) => {
                              e.target.src = "/images/flag/teamdefault.png";
                            }}
                          />
                          {consultant.isActive && (
                            <span className="active-status-dot"></span>
                          )}
                        </div>

                        {/* Name and Details */}
                        <div className="flex-grow-1">
                          <div className="flex align-items-center gap-2 mb-2">
                            <h5 className="card-title mb-0 fw-bold consultant-name">
                              {consultant.name}
                            </h5>
                            <span className="experience-badge">
                              {consultant.experience}+ Years of Experience
                            </span>
                          </div>
                          <p className="mb-2 consultant-profession">
                            {consultant.profession}
                          </p>
                        </div>
                      </div>

                      {/* Divider */}
                      <hr className="card-divider" />

                      {/* Information Section */}
                      <div className="mb-0">
                        <p className="mb-2 consultant-info">
                          <strong>Speaks:</strong>{" "}
                          {consultant.languages.join(", ")}
                        </p>
                        <div className="mb-0">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <strong className="consultant-info d-block">
                              Calling Options:
                            </strong>
                            {consultant.isBusy && (
                              <span className="busy-status-dot text-danger">
                                {/* wait for 5 minutes */}
                              </span>
                            )}
                          </div>
                          <div className="calling-options">
                            <button
                              className={`calling-option-btn chat-btn}`}
                              // disabled={consultant.isBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                viewChatsPage(consultant.id);
                              }}
                            >
                              <div className="calling-option-content">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                <span className="calling-option-label">
                                  Chat
                                </span>
                              </div>
                              <span className="calling-option-price">
                                {consultant.chatPrice.toLocaleString()}
                              </span>
                            </button>
                            <button
                              className="calling-option-btn audio-btn"
                              // disabled={consultant.isBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                startCall({
                                  receiverId: consultant.id,
                                  type: "voice",
                                });
                              }}
                            >
                              <div className="calling-option-content">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="lucide lucide-phone-icon lucide-phone"
                                >
                                  <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
                                </svg>
                                <span className="calling-option-label">
                                  Audio
                                </span>
                              </div>
                              <span className="calling-option-price">
                                {consultant.audioPrice.toLocaleString()}
                              </span>
                            </button>
                            <button
                              className="calling-option-btn video-btn"
                              // disabled={consultant.isBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                startCall({
                                  receiverId: consultant.id,
                                  type: "video",
                                });
                              }}
                            >
                              <div className="calling-option-content">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
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
                                </svg>
                                <span className="calling-option-label">
                                  Video
                                </span>
                              </div>
                              <span className="calling-option-price">
                                {consultant.videoPrice.toLocaleString()}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default ConsultantCards;
