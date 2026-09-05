import React, { useState, useCallback, useContext, useEffect } from "react";
import { Page, Layout, LegacyCard, FormLayout, TextField, Button, Banner } from "@shopify/polaris";
import axios from "axios";
import { ToastContext } from "../components/AlertModel/PolariesTostContext";
import { getWixAdminToken } from "../utils/getWixAdminToken";
import { useNavigate } from "react-router-dom";

/**
 * Create / edit a voucher (credit pack).
 * API paths are unchanged. Save failures surface as a page-level banner with a
 * plain message; the technical error is logged, not shown.
 */
function VoucherSettings() {
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();
  const backToVoucherManagement = () => navigate("/admin/voucher-management");

  const params = new URLSearchParams(window.location.search);
  const voucherId = params.get("id");
  const initialTotal = params.get("totalCoin") || "";
  const initialExtra = params.get("extraCoin") || "";
  const userId = localStorage.getItem("wix_id");

  const [formData, setFormData] = useState({ totalCoin: initialTotal, extraCoin: initialExtra });
  const [fieldError, setFieldError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({ totalCoin: initialTotal, extraCoin: initialExtra });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherId]);

  const handleFieldChange = useCallback(
    (fieldName) => (value) => {
      setFormData((prev) => ({ ...prev, [fieldName]: value }));
      setFieldError("");
      setSubmitError("");
    },
    [],
  );

  const validateForm = useCallback(() => {
    const total = String(formData.totalCoin ?? "").trim();
    if (!total) {
      setFieldError("Total credits are required");
      return false;
    }
    if (Number.isNaN(Number(total)) || Number(total) < 0) {
      setFieldError("Total credits must be a valid positive number");
      return false;
    }
    return true;
  }, [formData]);

  const payload = () => ({
    totalCoin: Number(formData.totalCoin),
    extraCoin: Number(formData.extraCoin) || 0,
  });

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;
    setSaving(true);
    setSubmitError("");
    try {
      const token = await getWixAdminToken();
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/admin/admin/voucher/${userId}`,
        payload(),
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } },
      );
      if (response.status === 200) {
        showToast(response.data?.message || "Voucher saved.");
        backToVoucherManagement();
      } else {
        setSubmitError(response.data?.message || "");
      }
    } catch (error) {
      console.error("[VOUCHER] save failed:", error.response?.data || error.message);
      setSubmitError(error.response?.data?.message || "");
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, validateForm]);

  const handleUpdate = useCallback(async () => {
    if (!validateForm()) return;
    setSaving(true);
    setSubmitError("");
    try {
      const token = await getWixAdminToken();
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_HOST}/api/admin/admin/voucher-updates/${userId}/${voucherId}`,
        payload(),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 200) {
        showToast(response.data?.message || "Voucher updated.");
        backToVoucherManagement();
      } else {
        setSubmitError(response.data?.message || "");
      }
    } catch (error) {
      console.error("[VOUCHER] update failed:", error.response?.data || error.message);
      setSubmitError(error.response?.data?.message || "");
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, validateForm, voucherId]);

  const isEdit = Boolean(voucherId);
  const total = Number(formData.totalCoin) || 0;
  const extra = Number(formData.extraCoin) || 0;

  return (
    <Page
      backAction={{ content: "Voucher Management", onAction: backToVoucherManagement }}
      title={isEdit ? "Edit voucher" : "Create voucher"}
      subtitle="Set how many credits a customer receives when they buy this pack."
    >
      <Layout>
        <Layout.Section>
          {submitError !== null && submitError !== undefined && submitError !== "" ? (
            <div style={{ marginBottom: 16 }}>
              <Banner title="Unable to save voucher" tone="critical" onDismiss={() => setSubmitError("")}>
                <p>Something went wrong while saving your changes. Please try again.</p>
              </Banner>
            </div>
          ) : null}

          <LegacyCard sectioned title="Credit configuration">
            <p className="saas-help">
              Customers pay for the total credits; bonus credits are added on top at no extra cost.
              {total > 0 && (
                <>
                  {" "}This pack gives <strong>{total + extra}</strong> credits.
                </>
              )}
            </p>
            <FormLayout>
              <TextField
                label="Total credits"
                type="number"
                value={String(formData.totalCoin ?? "")}
                onChange={handleFieldChange("totalCoin")}
                placeholder="e.g. 100"
                helpText="The amount the customer pays for."
                error={fieldError}
                autoComplete="off"
                min={0}
                step="1"
                requiredIndicator
              />
              <TextField
                label="Bonus credits"
                type="number"
                value={String(formData.extraCoin ?? "")}
                onChange={handleFieldChange("extraCoin")}
                placeholder="e.g. 10"
                helpText="Optional extra credits added to the pack."
                autoComplete="off"
                min={0}
                step="1"
              />
            </FormLayout>
            <div className="saas-form-actions">
              <Button onClick={backToVoucherManagement} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={isEdit ? handleUpdate : handleSubmit}
                loading={saving}
                disabled={saving}
              >
                {isEdit ? "Save changes" : "Create voucher"}
              </Button>
            </div>
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default VoucherSettings;
