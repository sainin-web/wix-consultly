import { Modal, Form, FormLayout, TextField, Select, InlineGrid } from "@shopify/polaris";
import { useEffect, useState } from "react";

/**
 * Approve a withdrawal request. Payload shape is unchanged
 * ({ userId, transactionId, mainType, amount, description, transactionNumber }).
 */
export default function WidthrwalRequestApprove({
  open,
  onClose,
  userDetails,
  updateFormData,
  setUpdateFormData,
  updateWallet,
  currency = "",
}) {
  const { userId, fullname, amount, description, id } = userDetails;
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUpdateFormData({
      userId,
      transactionId: id,
      fullname,
      mainType: "",
      amount,
      description,
      transactionNumber: "",
    });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDetails]);

  const handleChange = (field) => (value) => {
    setUpdateFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const mainTypeOptions = [
    { label: "Select a status", value: "" },
    { label: "Paid", value: "paid" },
  ];

  const validate = () => {
    const next = {};
    if (!updateFormData.mainType) next.mainType = "Choose a status";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateWallet();
    } finally {
      setSaving(false);
    }
  };

  const displayAmount = amount ? `${currency}${Number(amount).toFixed(2)}` : "—";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approve withdrawal"
      primaryAction={{ content: "Mark as paid", onAction: handleSave, loading: saving }}
      secondaryActions={[{ content: "Cancel", onAction: onClose, disabled: saving }]}
    >
      <Modal.Section>
        <Form onSubmit={handleSave}>
          <FormLayout>
            <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
              <TextField label="Consultant" value={fullname || ""} readOnly autoComplete="off" />
              <TextField label="Amount" value={displayAmount} readOnly autoComplete="off" />
            </InlineGrid>
            <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
              <Select
                label="Status"
                options={mainTypeOptions}
                value={updateFormData.mainType}
                onChange={handleChange("mainType")}
                error={errors.mainType}
                requiredIndicator
              />
              <TextField
                label="Transaction reference"
                value={updateFormData.transactionNumber}
                onChange={handleChange("transactionNumber")}
                placeholder="Bank or payout reference"
                autoComplete="off"
              />
            </InlineGrid>
            <TextField
              label="Note"
              value={updateFormData.description || ""}
              onChange={handleChange("description")}
              multiline={3}
              helpText="Shown to the consultant with the payout."
              autoComplete="off"
            />
          </FormLayout>
        </Form>
      </Modal.Section>
    </Modal>
  );
}
