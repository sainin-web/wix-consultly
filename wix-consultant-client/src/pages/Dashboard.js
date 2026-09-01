import { Layout, CalloutCard, Page } from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import { useEffect, useState, useRef, useCallback, Fragment } from "react";
import { animate } from "framer-motion";
import { SetupGuideNew } from "../components/dashboard/SetupGuide";
import { AppStatus } from "../components/dashboard/AppStatus";
import { StorefrontSetupWizard } from "../components/dashboard/StorefrontSetupWizard";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAdminDetails,
  fetchShopAllConsultants,
  fetchShopAllUsers,
  manageAppStatus,
} from "../components/Redux/slices/adminSlice";
import {
  formatAmountHelper,
  parseAdminPersenTage,
} from "../components/Helper/Helper";

// Component to display animated count with motion
function AnimatedCount({ value }) {
  const targetValue = value || 0;
  const [displayValue, setDisplayValue] = useState(targetValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(targetValue);

  useEffect(() => {
    if (value === undefined || value === null) {
      setDisplayValue(0);
      return;
    }

    const startValue = prevValueRef.current;
    prevValueRef.current = value;

    if (startValue !== value) {
      setIsAnimating(true);
      const controls = animate(startValue, value, {
        duration: 1.5,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => {
          setDisplayValue(Math.round(latest));
        },
        onComplete: () => {
          setIsAnimating(false);
        },
      });

      return () => controls.stop();
    }
  }, [value]);

  return (
    <span
      key={value}
      style={{
        display: "inline-block",
        transform: isAnimating ? "scale(1.1)" : "scale(1)",
        transition: "transform 0.3s ease-out",
      }}
    >
      {displayValue}
    </span>
  );
}

function Dashboard() {
  const dispatch = useDispatch();
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [adminDetails, setAdminDetails] = useState(null);
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const [enabled, setEnabled] = useState(null);
  const appStatus = useSelector((state) => state.admin.appStatus);
  const { adminDetails_, loading: adminDetailsLoading } = useSelector(
    (state) => state.admin,
  );
  const token =
    localStorage.getItem("wix_access_token")

  useEffect(() => {
    const id = localStorage.getItem("wix_id");
    setAdminIdLocal(id);
  }, []);

  useEffect(() => {
    if (adminDetails_) {
      setEnabled(adminDetails_?.appEnabled);
    }
  }, [adminDetails_]);
  useEffect(() => {
    if (adminIdLocal) {
      dispatch(fetchAdminDetails({ adminIdLocal, token }));
    }
  }, [adminIdLocal, appStatus]);

  const handleToggle = useCallback(() => {
    dispatch(manageAppStatus({ adminIdLocal, status: !enabled, token }));
  }, [enabled]);
  const { shopAllUsers, loading: shopAllUsersLoading } = useSelector(
    (state) => state.admin,
  );
  const { shopAllConsultants, loading: shopAllConsultantsLoading } =
    useSelector((state) => state.admin);
  const userCount = shopAllUsers?.data?.length || 0;
  const consultantCount = shopAllConsultants?.findConsultant?.length || 0;

  useEffect(() => {
    dispatch(fetchShopAllUsers({ adminIdLocal, token }));
    dispatch(fetchShopAllConsultants({ adminIdLocal, token }));
    dispatch(fetchAdminDetails({ adminIdLocal, token }));
  }, [dispatch, adminIdLocal]);

  useEffect(() => {
    if (adminDetails_) {
      setAdminDetails(adminDetails_);
    }
  }, [adminDetails_]);

  return (
    <Fragment>
      <Page
        title="Dashboard"
        subtitle="Overview of your consulting business"
      >
        <Layout>
          {isBannerVisible && (
            <Layout.Section>
              <div className="saas-welcome">
                <button
                  type="button"
                  className="saas-welcome-close"
                  aria-label="Dismiss welcome message"
                  onClick={() => setIsBannerVisible(false)}
                >
                  ✕
                </button>
                <h2>Welcome back, Admin! 👋</h2>
                <p>
                  Here&apos;s what&apos;s happening with your consulting
                  business today. Add new consultants, update their status, and
                  monitor consultations — all in one place.
                </p>
              </div>
            </Layout.Section>
          )}

          <Layout.Section>
            <div className="saas-stat-grid">
              <div className="saas-stat-card">
                <span className="saas-stat-icon saas-stat-icon--primary">
                  <i className="bi bi-people" aria-hidden="true" />
                </span>
                <div className="saas-stat-body">
                  <p className="saas-stat-value">
                    <AnimatedCount value={userCount} />
                  </p>
                  <p className="saas-stat-label">Total Clients</p>
                </div>
              </div>

              <div className="saas-stat-card">
                <span className="saas-stat-icon saas-stat-icon--violet">
                  <i className="bi bi-graph-up-arrow" aria-hidden="true" />
                </span>
                <div className="saas-stat-body">
                  <p className="saas-stat-value">
                    {parseAdminPersenTage(adminDetails_?.adminPersenTage) ?? 0}%
                  </p>
                  <p className="saas-stat-label">Conversion Rate</p>
                </div>
              </div>

              <div className="saas-stat-card">
                <span className="saas-stat-icon saas-stat-icon--success">
                  <i className="bi bi-briefcase" aria-hidden="true" />
                </span>
                <div className="saas-stat-body">
                  <p className="saas-stat-value">
                    <AnimatedCount value={consultantCount} />
                  </p>
                  <p className="saas-stat-label">Total Consultations</p>
                </div>
              </div>

              <div className="saas-stat-card">
                <span className="saas-stat-icon saas-stat-icon--warning">
                  <i className="bi bi-wallet2" aria-hidden="true" />
                </span>
                <div className="saas-stat-body">
                  <p className="saas-stat-value">
                    {adminDetails?.currency}
                    {formatAmountHelper(
                      adminDetails?.adminWalletBalance?.$numberDecimal || 0,
                    )}
                  </p>
                  <p className="saas-stat-label">Total Revenue</p>
                </div>
              </div>
            </div>
          </Layout.Section>

          <Layout.Section>
            <StorefrontSetupWizard consultantCount={consultantCount} />
          </Layout.Section>

          <Layout.Section>
            <AppStatus
              enabled={enabled}
              setEnabled={setEnabled}
              handleToggle={handleToggle}
              adminDetails_={adminDetails_}
              adminDetailsLoading={adminDetailsLoading}
              appStatus={appStatus?.appEnabled}
            />
          </Layout.Section>

          {/* Setup Guide */}
          <Layout.Section>
            <SetupGuideNew
              appStatus={appStatus?.appEnabled}
              enabled={enabled}
              consultantCount={consultantCount}
            />
          </Layout.Section>

          {/* CalloutCard */}
          <Layout.Section>
            <CalloutCard
              title="Manage Your Consultants Effectively"
              illustration="/jqv_intro.png"
              primaryAction={{
                content: "View All Consultants",
                // onAction: goToConsultantList,
                icon: PlusIcon,
              }}
            >
              <p>
                Access your consultant list to view, edit, and manage all your
                consultants. Track their availability, status, and consultation
                history in one place.
              </p>
            </CalloutCard>
          </Layout.Section>
        </Layout>
      </Page>
    </Fragment>
  );
}

export default Dashboard;
