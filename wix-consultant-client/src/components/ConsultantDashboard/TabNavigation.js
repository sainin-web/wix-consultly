import React, { useState, useEffect, Fragment } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import styles from "../../components/ConsultantDashboard/TabNavigation.module.css";
import { useDispatch, useSelector } from "react-redux";
import { ensureSocketRegistered, SOCKET_ROLE } from "../Sokect-io/SokectConfig";
import {
  getConsultantId,
  getShopId,
  clearConsultantSession,
} from "../../utils/wixStorage";
import { fetchConsultantById } from "../Redux/slices/ConsultantSlices";
import ConsultantProfileModal from "./ConsultantProfileModal";
import axios from "axios";
import DashboardTopNav, { NAV_ICONS } from "./DashboardTopNav";
import { markAllNotificationsRead, dismissNotificationsFrom } from "../Redux/slices/sokectSlice";

const isWixEmbed = () =>
  typeof window !== "undefined" && window.self !== window.top;

function TabNavigation({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState();
  const [shopId, setShopId] = useState();
  const [showModal, setShowModal] = useState(false);
  const dispatch = useDispatch();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    profileImage: null,
  });
  const { consultantOverview } = useSelector((state) => state.consultants);
  const notifications = useSelector((state) => state.socket.notifications) || [];

  const openNotification = (n) => {
    const search = location.search || window.location.search;
    if (n.type === "message") {
      dispatch(dismissNotificationsFrom(n.from));
      navigate(`/consultant-dashboard/chats${search}`, { state: { openUserId: n.from } });
    } else {
      navigate(`/consultant-dashboard/call-chat-logs${search}`);
    }
  };
  const params = new URLSearchParams(window.location.search);
  const shop = params.get("shop");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const storedUserId = getConsultantId();
    const storedShopId = getShopId();
    setUserId(storedUserId);
    setShopId(storedShopId);
  }, []);

  useEffect(() => {
    if (!shopId || !userId) return;
    dispatch( 
      fetchConsultantById({
        shop_id: shopId,
        consultant_id: userId,
        token,
        shop,
      }),
    );
  }, [dispatch, shopId, userId, token, shop]);

  console.log("userId", userId);

  const updateProfileDeatailsHandler = async () => {
    try {
      const formData = new FormData();

      formData.append("consultantId", userId);
      formData.append("shopId", shopId);
      formData.append("name", profile.name);
      formData.append("email", profile.email);
      formData.append("phone", profile.phone);
      formData.append("gender", profile.gender);

      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/update-profile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      console.log("Profile updated:", response.data);

      if (response.data.success) {
        dispatch(
          fetchConsultantById({
            shop_id: shopId,
            consultant_id: userId,
            token,
            shop,
          }),
        );
      }

      console.log("Profile updated:", response.data);
    } catch (error) {
      if (error.response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("shop");
        window.top.location.href = `${process.env.REACT_APP_FRONTEND_HOST}/login`;
      }
      console.error("Error updating profile details:", error);
    }
  };

  useEffect(() => {
    if (!userId) return;
    ensureSocketRegistered(userId, { role: SOCKET_ROLE.CONSULTANT });
  }, [userId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    if (page === "consulant-chats") {
      if (
        location.pathname !== "/consulant-chats" &&
        !location.pathname.startsWith("/consulant-chats")
      ) {
        setTimeout(() => {
          navigate("/consulant-chats", { replace: true });
        }, 100);
      }
    }
  }, [location.search, location.pathname, navigate]);

  // `collapseClass` controls which tabs fold into the "More" menu as the
  // viewport narrows — later entries collapse first.
  const menuItems = [
    {
      label: "Dashboard",
      path: "/consultant-dashboard",
      active: location.pathname === "/consultant-dashboard",
      icon: NAV_ICONS.dashboard,
      collapseClass: "collapse1",
    },
    {
      label: "Chats",
      path: "/consultant-dashboard/chats",
      active: location.pathname.startsWith("/consultant-dashboard/chats"),
      icon: NAV_ICONS.chats,
      collapseClass: "collapse2",
    },
    {
      label: "Call Logs",
      path: "/consultant-dashboard/call-chat-logs",
      active: location.pathname.startsWith(
        "/consultant-dashboard/call-chat-logs",
      ),
      icon: NAV_ICONS.callLogs,
      collapseClass: "collapse3",
    },
    {
      label: "Wallet",
      path: "/consultant-dashboard/consultant-wallet-logs",
      active: location.pathname.startsWith(
        "/consultant-dashboard/consultant-wallet-logs",
      ),
      icon: NAV_ICONS.wallet,
      collapseClass: "collapse4",
    },

    {
      label: "Withdrawals",
      // Both the table and the form live under the consultant dashboard; the
      // form stays reachable via the button inside WithdrawalRequestTable.
      path: "/consultant-dashboard/withdrawal-request-table",
      active: location.pathname.startsWith(
        "/consultant-dashboard/withdrawal-request",
      ),
      icon: NAV_ICONS.withdrawals,
      collapseClass: "collapse4",
    },
  ];

  const handleNavigation = (path) => {
    const search = location.search || window.location.search;
    navigate(`${path}${search}`);
  };

  /*
   * Height reporting is handled globally by useAutoResizeIframe()'s
   * ResizeObserver. The old setTimeout chain (120/450/1200ms) guessed at when
   * content would finish rendering; the observer reacts to the actual layout
   * change instead, so those timers are no longer needed.
   */

  const consultant = consultantOverview?.consultant;
  const displayName =
    consultant?.fullname ||
    localStorage.getItem("consultant_display_name") ||
    [localStorage.getItem("wix_first_name"), localStorage.getItem("wix_last_name")]
      .filter(Boolean)
      .join(" ")
      .trim();
  // Email intentionally not shown in the nav — it appears in the profile modal.
  // Repeating it in the header duplicated the same consultant details twice.

  const rawImage = consultant?.profileImage;
  const imageUrl = rawImage
    ? rawImage.startsWith("http")
      ? rawImage.replace(/^http:\/\//i, "https://")
      : `${process.env.REACT_APP_BACKEND_HOST}/${rawImage.replace(/\\/g, "/")}`
    : "";
  const isVideoCallPage =
    location.pathname === "/video-call" ||
    location.pathname.startsWith("/video-call");

  // Preserve the Wix instance across navigation so WixInstanceGuard keeps passing.
  const instanceQuery =
    location.search ||
    (localStorage.getItem("wix_instance")
      ? `?instance=${localStorage.getItem("wix_instance")}`
      : "");

  /**
   * Browse the public storefront WITHOUT ending the consultant session.
   * Separate from logout by design — the session keys are left intact, so the
   * "Consultant Login" link routes straight back into the dashboard.
   */
  const handleViewStorefront = () => {
    console.log("[DASHBOARD] View Storefront — session preserved");
    navigate(`/consultant/card${instanceQuery}`);
  };

  /**
   * Clears only consultant auth keys and returns to the public storefront.
   *
   * Previously this removed just "token"/"shop" and then set
   * window.top.location.href to `${REACT_APP_FRONTEND_HOST}/login` — an env var
   * that is not defined, so it navigated the whole Wix page to "undefined/login"
   * and broke out of the embed. Now it stays inside the iframe and uses the
   * canonical clear helper, which preserves wix_instance.
   */
  const handleLogout = () => {
    console.log("[DASHBOARD] Logout — clearing consultant session");
    clearConsultantSession();
    localStorage.removeItem("shop");
    // Tell the Custom Element to swap back to the public storefront iframe.
    try {
      window.parent.postMessage({ consultantLoggedOut: true }, "*");
    } catch (err) {
      console.warn("[DASHBOARD] could not notify parent widget:", err.message);
    }
    navigate(`/consultant/card${instanceQuery}`, { replace: true });
  };

  return (
    <Fragment>
      <ConsultantProfileModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        consultantOverview={consultantOverview}
        profile={profile}
        setProfile={setProfile}
        updateProfileDeatailsHandler={updateProfileDeatailsHandler}
      />

      <div
        className={`${styles.dashboardWrapper} ${isWixEmbed() ? styles.dashboardEmbed : ""} ${isVideoCallPage ? styles.videoCallMode : ""}`}
      >
        {!isVideoCallPage && (
          <DashboardTopNav
            items={menuItems}
            onNavigate={handleNavigation}
            onOpenProfile={() => setShowModal(true)}
            onViewStorefront={handleViewStorefront}
            onLogout={handleLogout}
            displayName={displayName}
            imageUrl={imageUrl}
            notifications={notifications}
            onOpenNotification={openNotification}
            onMarkAllRead={() => dispatch(markAllNotificationsRead())}
          />
        )}

        <div className={styles.mainContainer}>
          <div className={styles.contentArea}>
            <main className={styles.content}>
              <Outlet context={{ shop }} />
            </main>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

export default TabNavigation;
