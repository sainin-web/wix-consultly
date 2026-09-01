import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../components/ConsultantCards/ConsultantCards.css";
import { useDispatch, useSelector } from "react-redux";
import { fetchConsultantById } from "../Redux/slices/ConsultantSlices";
import { checkUserBalance, openCallPage } from "../middle-ware/OpenCallingPage";
import { fetchVoucherData } from "../Redux/slices/UserSlices";
import { useWixUser } from "../../useContext/WixUserContext";
import { getCustomerId } from "../../utils/wixStorage";

function ViewProfile() {
  const dispatch = useDispatch();
  const { user } = useWixUser();
  const userId = user?.wixDbId || getCustomerId();
  const { shop_id, consultant_id } = useParams();
  const navigate = useNavigate();

  const { consultantOverview, loading } = useSelector(
    (state) => state.consultants,
  );
  const { voucherData } = useSelector((state) => state.users);
  useEffect(() => {
    dispatch(
      fetchConsultantById({ shop_id: shop_id, consultant_id: consultant_id }),
    );
    dispatch(fetchVoucherData(shop_id));
  }, [dispatch, shop_id, consultant_id]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const consultantView = consultantOverview?.consultant;
  const imageUrl = `${process.env.REACT_APP_BACKEND_HOST}/${consultantView?.profileImage?.replace("\\", "/")}`;

  const startCall = async ({ receiverId, type }) => {
    await openCallPage({
      receiverId,
      type,
      userId,
      shop: shop_id,
      storeUrl: shop_id,
    });
  };

  const startChat = async (consultantId) => {
    if (!userId) return;
    const balance = await checkUserBalance({
      userId,
      consultantId,
      type: "chat",
      shop: shop_id,
    });
    if (balance?.requiresLogin) return;
    const instance =
      new URLSearchParams(window.location.search).get("instance") ||
      localStorage.getItem("wix_instance");
    const q = instance ? `?instance=${encodeURIComponent(instance)}` : "";
    navigate(`/chats/${consultantId}${q}`);
  };
  const backToHome = () => {
    const instance =
      new URLSearchParams(window.location.search).get("instance") ||
      localStorage.getItem("wix_instance");
    const q = instance ? `?instance=${encodeURIComponent(instance)}` : "";
    navigate(`/consultant/card${q}`);
  };

  return (
    <div className="view-profile-container">
      <div className="container py-4">
        {/* Back Button */}
        <button
          className="btn btn-link back-button mb-3"
          onClick={() => backToHome()}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: "8px", verticalAlign: "middle" }}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Consultants
        </button>

        {/* Profile Header */}
        <div className="card shadow-sm border-0 mb-4 profile-header-card">
          <div className="card-body p-4">
            {/* Profile Section */}
            <div className="flex align-items-start mb-3">
              {/* Profile Image */}
              <div className="me-4 position-relative flex-shrink-0">
                <img
                  src={imageUrl || "/images/flag/teamdefault.png"}
                  alt={consultantView?.fullname}
                  className="rounded-circle profile-image profile-image-large"
                  onError={(e) => {
                    e.target.src = "/images/flag/teamdefault.png";
                  }}
                />
                {consultantView?.isActive && (
                  <span className="active-status-dot active-status-dot-large"></span>
                )}
              </div>

              {/* Name and Details */}
              <div className="flex-grow-1">
                <div className="flex align-items-center gap-2 mb-3">
                  <h5 className="card-title mb-0 fw-bold consultant-name consultant-name-large">
                    {consultantView?.fullname}
                  </h5>
                  <span className="experience-badge experience-badge-large">
                    {consultantView?.experience}+ Years of Experience
                  </span>
                </div>
                <p className="mb-3 consultant-profession consultant-profession-large">
                  {consultantView?.profession} -{" "}
                  {consultantView?.specialization}
                </p>
              </div>
            </div>

            <hr className="card-divider my-2" />

            <div className="mb-0">
              <p className="mb-2 consultant-info">
                <strong className="ml-2">Speaks:</strong>
                {consultantView?.language?.map((lang) => {
                  return <span key={lang}>{lang} , </span>;
                })}
              </p>
              <div className="mb-0">
                <strong className="consultant-info d-block mb-2">
                  Calling Options:
                </strong>
                <div className="calling-options">
                  <button
                    className="calling-option-btn chat-btn border-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      startChat(consultantView?._id);
                      // navigate(`/user-chat/${consultantView?._id}`);
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
                      <span className="calling-option-label">Chat</span>
                    </div>
                    <span className="calling-option-price">
                      {voucherData?.shopCurrency}
                      {consultantView?.chatPerMinute}{" "}
                    </span>
                  </button>
                  <button
                    className="calling-option-btn audio-btn"
                    onClick={(e) => {
                      startCall({
                        receiverId: consultantView?._id,
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
                      <span className="calling-option-label">Voice Call</span>
                    </div>
                    <span className="calling-option-price">
                      {voucherData?.shopCurrency}
                      {consultantView?.voicePerMinute}
                    </span>
                  </button>
                  <button
                    className="calling-option-btn video-btn"
                    onClick={(e) => {
                      startCall({
                        receiverId: consultantView?._id,
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
                      <span className="calling-option-label">Video</span>
                    </div>
                    <span className="calling-option-price">
                      {voucherData?.shopCurrency}
                      {consultantView?.videoPerMinute}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Left Column */}
          <div className="col-lg-8">
            {/* About Section */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-body p-4">
                <h3 className="section-title mb-3">About</h3>
                <p className="about-text">
                  {
                    "An astrologer is a practitioner who studies the positions and movements of celestial bodies to offer insights into human life, personality traits, and future events. They often use tools like horoscopes and birth charts to analyze how the sun, moon, and planets influence an individual's fate. While considered a pseudoscience by the scientific community, many people seek astrologers for guidance, comfort, and self-reflection. "
                  }
                </p>
              </div>
            </div>

            {/* Education & Certifications */}
            {/* <div className="card shadow-sm border-0 mb-4">
                            <div className="card-body p-4">
                                <h3 className="section-title mb-3">Education & Certifications</h3>
                                <div className="mb-3">
                                    <h5 className="subsection-title">Education</h5>
                                    <p className="info-text">{consultant.education}</p>
                                </div>
                                <div>
                                    <h5 className="subsection-title">Certifications</h5>
                                    <ul className="certifications-list">
                                        {consultant.certifications.map((cert, index) => (
                                            <li key={index}>{cert}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div> */}
          </div>

          {/* Right Column */}
          <div className="col-lg-4">
            {/* Expertise Tags */}
            {/* <div className="card shadow-sm border-0 mb-4">
                            <div className="card-body p-4">
                                <h3 className="section-title mb-3">Expertise</h3>
                                <div className="expertise-tags">
                                    {consultant.expertise.map((tag, index) => (
                                        <span key={index} className="expertise-tag">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div> */}

            {/* Calling Options */}
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h3 className="section-title mb-3">Calling Options</h3>
                <div className="calling-options-profile-sidebar">
                  <button
                    className="calling-option-btn chat-btn"
                    onClick={() => startChat(consultantView?._id)}
                    title={`Chat - ${voucherData?.shopCurrency} ${consultantView?.chatPerMinute}`}
                  >
                    <svg
                      width="24"
                      height="24"
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
                  </button>
                  <button
                    className="calling-option-btn audio-btn"
                    onClick={() =>
                      startCall({
                        receiverId: consultantView?._id,
                        type: "voice",
                      })
                    }
                    title={`Audio Call - ${voucherData?.shopCurrency} ${consultantView?.voicePerMinute}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
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
                  </button>
                  <button
                    className="calling-option-btn video-btn"
                    onClick={() =>
                      startCall({
                        receiverId: consultantView?._id,
                        type: "video",
                      })
                    }
                    title={`Video Call - ${voucherData?.shopCurrency} ${consultantView?.videoPerMinute}`}
                  >
                    <svg
                      width="24"
                      height="24"
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
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewProfile;
