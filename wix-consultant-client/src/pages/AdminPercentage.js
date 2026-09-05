import { TextField, Button, Form, FormLayout, Page, Layout, LegacyCard } from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { fetchAdminDetails } from "../components/Redux/slices/adminSlice";
import { useDispatch, useSelector } from "react-redux";
import { usePolarisToast } from "../components/AlertModel/PolariesTostContext";
import { getWixAdminToken } from "../utils/getWixAdminToken";
import { parseAdminPersenTage } from "../components/Helper/Helper";

/** Platform commission. Calculation logic and API are unchanged. */
function AdminPercentage() {
  const dispatch = useDispatch();
  const { showToast } = usePolarisToast();
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const { adminDetails_ } = useSelector((state) => state.admin);
  const [percentage, setPercentage] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(false);
  const [percentageError, setPercentageError] = useState(null);

  useEffect(() => {
    setAdminIdLocal(localStorage.getItem("wix_id"));
  }, []);

  useEffect(() => {
    if (adminIdLocal) dispatch(fetchAdminDetails({ adminIdLocal }));
  }, [adminIdLocal, dispatch]);

  useEffect(() => {
    const n = parseAdminPersenTage(adminDetails_?.adminPersenTage);
    if (n !== null && n !== undefined) {
      setPercentage(String(n));
      setSaved(String(n));
    }
  }, [adminDetails_?.adminPersenTage]);

  const handleChange = useCallback((value) => {
    setPercentage(value);
    setPercentageError(null);
  }, []);

  const dirty = percentage !== saved;

  const handleSubmit = async () => {
    const n = Number(percentage);
    if (percentage === "" || Number.isNaN(n) || n < 0 || n > 100) {
      setPercentageError("Enter a percentage between 0 and 100");
      return;
    }
    try {
      setLoading(true);
      const token = await getWixAdminToken();
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_HOST}/api/admin/admin/update-percentage/${adminIdLocal}`,
        { adminPercentage: n },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.success === true) {
        showToast(response.data.message);
        setSaved(percentage);
      } else {
        showToast(response.data.message, true);
      }
    } catch (error) {
      showToast("Could not update the commission. Please try again.", true);
    } finally {
      setLoading(false);
    }
  };

  const consultantShare = percentage === "" ? null : Math.max(0, 100 - Number(percentage));

  return (
    <Page
      title="Admin Charges"
      subtitle="The commission your store keeps from every paid consultation."
    >
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned title="Platform commission">
            <p className="saas-help">
              When a consultation is charged, this percentage is credited to the admin wallet and the
              remainder goes to the consultant.
              {consultantShare !== null && !Number.isNaN(consultantShare) && (
                <>
                  {" "}At <strong>{Number(percentage)}%</strong>, consultants receive{" "}
                  <strong>{consultantShare}%</strong> of each session.
                </>
              )}
            </p>
            <Form onSubmit={handleSubmit}>
              <FormLayout>
                <TextField
                  label="Commission"
                  type="number"
                  value={percentage}
                  onChange={handleChange}
                  min={0}
                  max={100}
                  suffix="%"
                  autoComplete="off"
                  helpText="Between 0 and 100."
                  error={percentageError}
                />
              </FormLayout>
              <div className="saas-form-actions">
                <Button onClick={() => setPercentage(saved)} disabled={!dirty || loading}>
                  Cancel
                </Button>
                <Button variant="primary" submit loading={loading} disabled={!dirty || loading}>
                  Save changes
                </Button>
              </div>
            </Form>
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default AdminPercentage;
