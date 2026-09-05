import { LegacyCard, Page, Layout, Badge } from "@shopify/polaris";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminDetails } from "../components/Redux/slices/adminSlice";
import { humanizeStatus } from "../components/Helper/Helper";

export default function AccountInformation() {
  const dispatch = useDispatch();
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const { adminDetails_, loading } = useSelector((state) => state.admin);
  const appToken = localStorage.getItem("appToken");

  useEffect(() => {
    setAdminIdLocal(localStorage.getItem("wix_id"));
  }, []);

  useEffect(() => {
    if (adminIdLocal) dispatch(fetchAdminDetails({ adminIdLocal, appToken }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminIdLocal]);

  const plan = adminDetails_?.accountPlanInfo?.[0] || null;
  const site = adminDetails_?.shop_Domain || "—";

  return (
    <Page title="Account" subtitle="Your site and subscription details.">
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned title="Site">
            <dl className="saas-dl">
              <div>
                <dt>Site domain</dt>
                <dd>{site}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>{adminDetails_?.currencyCode || adminDetails_?.currency || "—"}</dd>
              </div>
              <div>
                <dt>App status</dt>
                <dd>
                  <Badge tone={adminDetails_?.appEnabled ? "success" : "critical"}>
                    {adminDetails_?.appEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </dd>
              </div>
            </dl>
          </LegacyCard>

          <LegacyCard sectioned title="Subscription">
            {loading && !adminDetails_ ? (
              <div className="saas-loading">Loading…</div>
            ) : plan ? (
              <dl className="saas-dl">
                <div>
                  <dt>Plan</dt>
                  <dd>{plan.planName || "—"}</dd>
                </div>
                <div>
                  <dt>Billing</dt>
                  <dd>{humanizeStatus(plan.planType)}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>
                    {plan.planAmount ? `${plan.planAmount} ${plan.currency || ""}`.trim() : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{humanizeStatus(adminDetails_?.planStatus)}</dd>
                </div>
              </dl>
            ) : (
              <div className="saas-empty">
                <span className="saas-empty-icon" aria-hidden="true">
                  <i className="bi bi-credit-card" />
                </span>
                <p className="saas-empty-title">No subscription on file</p>
                <p className="saas-empty-text">
                  Plan details will appear here once billing is set up.
                </p>
              </div>
            )}
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
