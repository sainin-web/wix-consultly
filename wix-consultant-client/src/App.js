  import { Fragment, useEffect, Suspense, lazy, useState } from "react";
  import {
    Routes,
    Route,
    Navigate,
    useSearchParams,
    useNavigate,
    useLocation,
  } from "react-router-dom";
  import { useDispatch } from "react-redux";
  import { verifyToken } from "./components/Redux/slices/authConsultantSlice";
  import {
    checkWixInstance,
    setInstance,
  } from "./components/Redux/slices/wixAuthSlice";
  import "./App.css";
  import "./css/saas-theme.css";

  import GlobalMessageNotification from "./components/AlertModel/GlobalMessageNotification";
  import IncomingCallAlert from "./components/AlertModel/IncommingCallAlert";
  import PushCallIncoming from "./components/AlertModel/PushCallIncoming";
  import LayoutBigCommerce from "./pages/LayoutBigCommerce";
  import useAutoResizeIframe from "./components/middle-ware/GlobleResizer";
  import WixProtectedRoute from "./components/ProtectRoute/WixProtectedRoute";
  import ErrorPage from "./pages/ErrorPage";
  import TestHash from "./pages/TestHash";
  import StorefrontShell from "./components/ProtectRoute/StorefrontShell";
  import { persistCustomerId } from "./utils/wixStorage";

  // ── Lazy pages ────────────────────────────────────────────────────────────────
  const Dashboard = lazy(() => import("./pages/Dashboard"));
  const ConsultantList = lazy(() => import("./pages/ConsultantList"));
  const AddConsultant = lazy(() => import("./pages/AddConsultant"));
  const Faq = lazy(() => import("./pages/Faq"));
  const ConsultantCards = lazy(
    () => import("./components/ConsultantCards/ConsultantCards"),
  );
  const ViewProfile = lazy(
    () => import("./components/ConsultantCards/ViewProfile"),
  );
  const TabNavigation = lazy(
    () => import("./components/ConsultantDashboard/TabNavigation"),
  );
  const VideoCallingPage = lazy(
    () => import("./components/ConsultantDashboard/VideoCallingPage"),
  );
  const UserChat = lazy(() => import("./components/ClientDashbord/UserChat"));
  const LoginForm = lazy(
    () => import("./components/ConsultantDashboard/LoginForm"),
  );
  const ProfileSection = lazy(
    () => import("./components/ClientDashbord/ProfileSection"),
  );
  const Voucher = lazy(() => import("./pages/Voucher"));
  const History = lazy(() => import("./pages/History"));
  const VoucherSettings = lazy(() => import("./pages/VoucherSettings"));
  const FcmTokenWindow = lazy(() => import("./firebase/utils/FcmTokenWindow"));
  const UserTransHistory = lazy(() => import("./pages/UserTransHistory"));
  const ManualDebetCreditBlance = lazy(
    () => import("./pages/ManualDebetCreditBlance"),
  );
  const VoucherTable = lazy(() => import("./pages/VoucherTable"));
  const AccountInformation = lazy(() => import("./pages/AccountInformation"));
  const ChatsPage = lazy(
    () => import("./components/ConsultantDashboard/ChatsPage"),
  );
  const DashboardPage = lazy(
    () => import("./components/ConsultantDashboard/DashboardPage"),
  );
  const CallLogsConsultant = lazy(
    () => import("./components/ConsultantDashboard/CallChatLogsConsultant"),
  );
  const ConsultantWalletLogs = lazy(
    () => import("./components/ConsultantDashboard/ConsultantWalletLogs"),
  );
  const WithdrawalRequestForm = lazy(
    () => import("./components/ConsultantDashboard/WithdrawalRequestForm"),
  );
  const WithdrawalRequest = lazy(() => import("./pages/WithdrawalRequest"));
  const WithdrawalRequestTable = lazy(
    () => import("./components/ConsultantDashboard/WithdrawalRequestTable"),
  );
  const AdminPercentage = lazy(() => import("./pages/AdminPercentage"));
  const RevenuManagement = lazy(() => import("./pages/RevenuManagement"));
  const WixPaymentsPlaceholder = lazy(
    () => import("./pages/WixPaymentsPlaceholder"),
  );

  // ── App ───────────────────────────────────────────────────────────────────────
  export default function App({
    instanceId: instanceFromWidget = "",
    embeddedInWidget = false,
  }) {
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState();

    useEffect(() => {
      dispatch(verifyToken());

      const resolveInstance = () => {
        const fromUrl = new URLSearchParams(window.location.search).get(
          "instance",
        );
        console.log("fromUrl", fromUrl);
        return (
          fromUrl ||
          instanceFromWidget ||
          localStorage.getItem("wix_instance") ||
          null
        );
      };

      const runCheck = (instance) => {
        if (!instance) {
          dispatch(checkWixInstance(null));
          return;
        }
        localStorage.setItem("wix_instance", instance);
        dispatch(setInstance(instance));
        dispatch(checkWixInstance(instance));
      };

      const immediate = resolveInstance();
      if (immediate) {
        runCheck(immediate);
        return;
      }

      if (embeddedInWidget && !instanceFromWidget) {
        return;
      }

      const timer = setTimeout(() => runCheck(resolveInstance()), 2500);
      return () => clearTimeout(timer);
    }, [dispatch, instanceFromWidget, embeddedInWidget]);

    useEffect(() => {
      const onParentMessage = (event) => {
        const data = event.data;
        const inst =
          (typeof data === "object" && data !== null
            ? data.instance || data.payload?.instance
            : null) || null;

        if (!inst || typeof inst !== "string" || inst.length < 8) return;
        if (localStorage.getItem("wix_instance") === inst) return;

        localStorage.setItem("wix_instance", inst);
        dispatch(setInstance(inst));
        dispatch(checkWixInstance(inst));
      };

      window.addEventListener("message", onParentMessage);
      return () => window.removeEventListener("message", onParentMessage);
    }, [dispatch]);

    useAutoResizeIframe();

    // ── Login/Dashboard redirect guard ──
    useEffect(() => {
      const isLoggedIn = localStorage.getItem("consultant_logged_in");
      const token = localStorage.getItem("token");
      const currentPath = location.pathname;
      const instance =
        new URLSearchParams(window.location.search).get("instance") ||
        localStorage.getItem("wix_instance");
      const q = instance ? `?instance=${instance}` : "";

      // Already logged in → skip login page
      if (isLoggedIn === "true" && token && currentPath === "/login") {
        navigate(`/consultant-dashboard${q}`, { replace: true });
        return;
      }

      // Not logged in → block dashboard
      if (
        (!isLoggedIn || !token) &&
        currentPath.startsWith("/consultant-dashboard")
      ) {
        navigate(`/login${q}`, { replace: true });
        return;
      }
    }, [location.pathname]);

    const instance = searchParams.get("instance");
    const q = instance ? `?instance=${instance}` : "";

    const [wixUser, setWixUser] = useState();
    useEffect(() => {
      // URL se Wix user data lo (page load pe)
      const params = new URLSearchParams(window.location.search);
      if (params.get("wixLoggedIn") === "true") {
        setWixUser({
          id: params.get("wixMemberId"),
          email: params.get("wixEmail"),
          name: params.get("wixName"),
          photo: params.get("wixPhoto"),
        });
      }

      window.addEventListener("message", (e) => {
        if (e.data?.type === "WIX_USER_LOGGED_IN") {
          console.log("Wix user logged in:", e.data.wixEmail);
          setWixUser({
            id: e.data.wixMemberId,
            email: e.data.wixEmail,
            name: e.data.wixName,
            photo: e.data.wixPhoto,
          });
        }
      });
    }, []);

    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const isLoggedIn = params.get("wixLoggedIn");
      const email = params.get("wixEmail");
      const firstName = params.get("wixName");
      const lastName = params.get("wixLastName");
      const memberId = params.get("wixMemberId");
      const photo = params.get("wixPhoto");
      const wixDbId = params.get("wixDbId");

      if (isLoggedIn === "true" && wixDbId) {
        console.log("✅ Logged in user:", email);
        persistCustomerId(wixDbId, {
          email,
          firstName,
          lastName,
          memberId,
          photo,
        });
        setUser({ email, firstName, lastName, memberId, photo, wixDbId });
      } else {
        console.log(" Guest — login page dikhao");
      }
    }, []);

    console.log("user", user);

    return (
      <Fragment>
        <GlobalMessageNotification />
        <IncomingCallAlert />
        <Suspense fallback={<div className="loading-screen">Loading...</div>}>
          <Routes>
            {/* ── Public / utility ── */}
            <Route path="/TestHash" element={<TestHash />} />
            <Route
              path="/admin/pricing-page"
              element={<WixPaymentsPlaceholder />}
            />
            <Route path="/error" element={<ErrorPage />} />
            <Route
              path="/video/calling/page"
              element={
                // <StorefrontShell className="iframe-page-shell">
                  <VideoCallingPage />
              }
            />
            <Route
              path="/chats/:id"
              element={
                // <StorefrontShell className="iframe-page-shell chat-route-shell">
                  <UserChat />
                // </StorefrontShell>
              }
            />
            <Route path="/fcm-token" element={<FcmTokenWindow />} />
            <Route path="/push-call-incoming" element={<PushCallIncoming />} />

            {/* ── Root redirects ── */}
            <Route path="/" element={<Navigate to={`/admin${q}`} replace />} />
            <Route
              path="/dashboard"
              element={<Navigate to={`/admin${q}`} replace />}
            />

            {/* ── Admin — Wix protected ── */}
            <Route
              path="/admin"
              element={
                <WixProtectedRoute>
                  <LayoutBigCommerce />
                </WixProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="consultant-list" element={<ConsultantList />} />
              <Route
                path="consultant-list/add-consultant"
                element={<AddConsultant />}
              />
              <Route path="history" element={<UserTransHistory />} />
              <Route
                path="wallet-management"
                element={<ManualDebetCreditBlance />}
              />
              <Route path="withdrawal-request" element={<WithdrawalRequest />} />
              <Route
                path="account-information"
                element={<AccountInformation />}
              />
              <Route path="voucher-management" element={<VoucherTable />} />
              <Route
                path="voucher-management/voucher"
                element={<VoucherSettings />}
              />
              <Route path="admin-percentage" element={<AdminPercentage />} />
              <Route path="revenue-management" element={<RevenuManagement />} />
              <Route path="faq" element={<Faq />} />
            </Route>

            {/* ── Storefront — WixInstanceGuard protected ── */}
            <Route
              path="/consultant/card"
              element={
                <StorefrontShell>
                  <ConsultantCards />
                </StorefrontShell>
              }
            />

            <Route
              path="/view-profile/:shop_id/:consultant_id"
              element={
                <StorefrontShell>
                  <ViewProfile />
                </StorefrontShell>
              }
            />

            <Route
              path="/login"
              element={
                // <StorefrontShell>
                  <LoginForm />
                // </StorefrontShell>
              }
            />

            <Route
              path="/profile"
              element={
                <StorefrontShell>
                  <ProfileSection />
                </StorefrontShell>
              }
            >
              <Route index element={<Voucher />} />
              <Route path="voucher" element={<Voucher />} />
              <Route path="history" element={<History />} />
              <Route path="call-chat-logs" element={<CallLogsConsultant />} />
            </Route>

            <Route
              path="/consultant-dashboard"
              element={
                <StorefrontShell className="iframe-page-shell consultant-dashboard-shell">
                  <TabNavigation />
                </StorefrontShell>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="chats/:chatId?" element={<ChatsPage />} />
              <Route path="call-chat-logs" element={<CallLogsConsultant />} />
              <Route
                path="consultant-wallet-logs"
                element={<ConsultantWalletLogs />}
              />
              <Route
                path="withdrawal-request"
                element={<WithdrawalRequestForm />}
              />
              <Route
                path="withdrawal-request-table"
                element={<WithdrawalRequestTable />}
              />
            </Route>

            <Route path="*" element={<Navigate to="/error" replace />} />
          </Routes>
        </Suspense>
      </Fragment>
    );
  }
