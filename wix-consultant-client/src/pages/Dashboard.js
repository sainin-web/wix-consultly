import { Layout, Page } from "@shopify/polaris";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppStatus } from "../components/dashboard/AppStatus";
import { StorefrontSetupWizard } from "../components/dashboard/StorefrontSetupWizard";
import {
  fetchAdminDetails,
  fetchShopAllConsultants,
  fetchShopAllUsers,
  manageAppStatus,
} from "../components/Redux/slices/adminSlice";
import { formatCurrency, parseAdminPersenTage } from "../components/Helper/Helper";

/**
 * Metrics are limited to what the existing admin endpoints actually return:
 * consultant list (count + consultantStatus), user list (count), and the
 * shop record (admin wallet balance, commission %). Nothing is invented.
 */
function MetricCard({ icon, label, value, loading }) {
  return (
    <div className="saas-stat-card">
      <span className="saas-stat-icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <div className="saas-stat-body">
        {loading ? (
          <span className="saas-stat-value--skeleton" aria-label="Loading" />
        ) : (
          <p className="saas-stat-value">{value}</p>
        )}
        <p className="saas-stat-label">{label}</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const dispatch = useDispatch();
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const [enabled, setEnabled] = useState(null);

  const appStatus = useSelector((state) => state.admin.appStatus);
  const {
    adminDetails_,
    loading: adminDetailsLoading,
    shopAllUsers,
    shopAllConsultants,
  } = useSelector((state) => state.admin);
  const token = localStorage.getItem("wix_access_token");

  useEffect(() => {
    setAdminIdLocal(localStorage.getItem("wix_id"));
  }, []);

  useEffect(() => {
    if (!adminIdLocal) return;
    dispatch(fetchShopAllUsers({ adminIdLocal, token }));
    dispatch(fetchShopAllConsultants({ adminIdLocal, token }));
    dispatch(fetchAdminDetails({ adminIdLocal, token }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, adminIdLocal, appStatus]);

  useEffect(() => {
    if (adminDetails_) setEnabled(adminDetails_?.appEnabled);
  }, [adminDetails_]);

  const handleToggle = useCallback(() => {
    dispatch(manageAppStatus({ adminIdLocal, status: !enabled, token }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, adminIdLocal]);

  const consultants = useMemo(
    () => shopAllConsultants?.findConsultant || [],
    [shopAllConsultants],
  );
  const consultantCount = consultants.length;
  const activeConsultants = useMemo(
    () => consultants.filter((c) => c?.consultantStatus).length,
    [consultants],
  );
  const userCount = shopAllUsers?.data?.length || 0;
  const currency = adminDetails_?.currency || "";
  const commission = parseAdminPersenTage(adminDetails_?.adminPersenTage);

  const metricsLoading = !adminDetails_ && adminDetailsLoading;

  return (
    <Page title="Dashboard" subtitle="An overview of your consultation business.">
      <Layout>
        <Layout.Section>
          <div className="saas-stat-grid">
            <MetricCard
              icon="bi-people"
              label="Consultants"
              value={consultantCount}
              loading={metricsLoading}
            />
            <MetricCard
              icon="bi-person-check"
              label="Active consultants"
              value={activeConsultants}
              loading={metricsLoading}
            />
            <MetricCard
              icon="bi-person"
              label="Clients"
              value={userCount}
              loading={metricsLoading}
            />
            <MetricCard
              icon="bi-wallet2"
              label={
                commission !== null && commission !== undefined
                  ? `Admin wallet · ${commission}% commission`
                  : "Admin wallet"
              }
              value={formatCurrency(currency, adminDetails_?.adminWalletBalance)}
              loading={metricsLoading}
            />
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
      </Layout>
    </Page>
  );
}

export default Dashboard;
