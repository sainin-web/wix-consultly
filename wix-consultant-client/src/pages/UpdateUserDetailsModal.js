import { Modal, Form, FormLayout, TextField, Select, InlineGrid } from "@shopify/polaris";
import { useState } from "react";

/**
 * Manual wallet adjustment. Payload shape is unchanged
 * ({ mainType, amount, description } + userId from the caller).
 */
export default function UpdateUserDetailsModal({
  open,
  onClose,
  userDetails,
  updateFormData,
  setUpdateFormData,
  updateWallet,
  currency = "",
}) {
  const { fullname } = userDetails;
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (value) => {
    setUpdateFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const mainTypeOptions = [
    { label: "Select a type", value: "" },
    { label: "Manual credit", value: "manual_credit" },
    { label: "Manual debit", value: "manual_debit" },
    { label: "Recharge", value: "recharge" },
    { label: "Refund", value: "refund" },
  ];

  const validate = () => {
    const next = {};
    if (!updateFormData.mainType) next.mainType = "Choose a transaction type";
    const amount = Number(updateFormData.amount);
    if (updateFormData.amount === "" || Number.isNaN(amount) || amount <= 0) {
      next.amount = "Enter an amount greater than 0";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const ok = await updateWallet();
      if (ok !== false) onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Adjust wallet balance"
      primaryAction={{ content: "Apply adjustment", onAction: handleSave, loading: saving }}
      secondaryActions={[{ content: "Cancel", onAction: handleClose, disabled: saving }]}
    >
      <Modal.Section>
        <Form onSubmit={handleSave}>
          <FormLayout>
            <TextField label="User" value={fullname || ""} readOnly autoComplete="off" />
            <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
              <Select
                label="Type"
                options={mainTypeOptions}
                value={updateFormData.mainType}
                onChange={handleChange("mainType")}
                error={errors.mainType}
                requiredIndicator
              />
              <TextField
                label="Amount"
                type="number"
                prefix={currency || undefined}
                value={updateFormData.amount}
                onChange={handleChange("amount")}
                error={errors.amount}
                autoComplete="off"
                min={0}
                requiredIndicator
              />
            </InlineGrid>
            <TextField
              label="Note"
              value={updateFormData.description}
              onChange={handleChange("description")}
              multiline={3}
              placeholder="Why is this adjustment being made?"
              helpText="Shown in the wallet history."
              autoComplete="off"
            />
          </FormLayout>
        </Form>
      </Modal.Section>
    </Modal>
  );
}
