import React, { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { fetchConsultantById } from "../Redux/slices/ConsultantSlices";
import { formatCurrency } from "../Helper/Helper";
import ReactToast from "../AlertModel/ReactToast";
import { fetchVoucherData } from "../Redux/slices/UserSlices";
import { getConsultantId, getShopId } from "../../utils/wixStorage";

/**
 * Request a payout. POST /api-consultant/submit/withdrawal/request — unchanged.
 * Validation is inline (no alert()); the page is a single card so its height
 * is exactly its content for the Wix iframe.
 */
const WithdrawalRequestForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState("");
  const consultantId = getConsultantId();
  const shopId = getShopId();
  const { consultantOverview } = useSelector((state) => state.consultants);
  const { voucherData } = useSelector((state) => state.users);
  const token = localStorage.getItem("token");
  const shop = localStorage.getItem("shop");
  const currency = voucherData?.shopCurrency || "";
  const balance = Number(consultantOverview?.consultant?.walletBalance) || 0;

  useEffect(() => {
    if (shopId && consultantId) {
      dispatch(fetchConsultantById({ shop_id: shopId, consultant_id: consultantId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, consultantId, showToast]);

  useEffect(() => {
    if (shopId) dispatch(fetchVoucherData(shopId, token, shop));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const backToList = () => navigate(`/consultant-dashboard/withdrawal-request-table${window.location.search}`);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (value > balance) {
      setError("Amount exceeds your available balance.");
      return;
    }
    setError("");
    try {
      setLoading(true);
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api-consultant/submit/withdrawal/request/${consultantId}/${shopId}`,
        { amount, note },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.status === 201) {
        setShowToast(true);
        setAmount("");
        setNote("");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("shop");
        window.top.location.href = `https://${shop}/apps/consultant-theme/login`;
        return;
      }
      setError(err?.response?.data?.message || "Could not submit the request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fragment>
      <ReactToast
        show={showToast}
        message="Withdrawal request submitted"
        onClose={() => setShowToast(false)}
        duration={3000}
      />
      <div className="cds-page" style={{ maxWidth: 560 }}>
        <div>
          <button type="button" className="cds-back" onClick={backToList}>
            <HiOutlineArrowLeft />
            Back to withdrawals
          </button>
          <h1>Request withdrawal</h1>
          <p>Funds are paid out once the store owner approves the request.</p>
        </div>

        <form className="cds-card" onSubmit={handleSubmit} noValidate>
          <div className="cds-card-head">
            <div>
              <h2>Available balance</h2>
              <p>The most you can request right now.</p>
            </div>
            <div className="cds-metric-value" style={{ marginTop: 0 }}>
              {consultantOverview ? formatCurrency(currency, balance) : "…"}
            </div>
          </div>

          <div className="cds-card-body" style={{ display: "grid", gap: 14 }}>
            <div className="cds-field">
              <label htmlFor="withdraw-amount">Amount</label>
              <div className="cds-input-prefix">
                {currency && <span>{currency}</span>}
                <input
                  id="withdraw-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError("");
                  }}
                  aria-invalid={Boolean(error)}
                />
              </div>
              {error ? (
                <span className="cds-error" role="alert">{error}</span>
              ) : (
                <span className="cds-hint">Up to {formatCurrency(currency, balance)}.</span>
              )}
            </div>

            <div className="cds-field">
              <label htmlFor="withdraw-note">Payment details</label>
              <textarea
                id="withdraw-note"
                rows={3}
                placeholder="Bank account, UPI or any note for the store owner (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <span className="cds-hint">Shared with the store owner along with your request.</span>
            </div>

            <div className="cds-actions" style={{ marginTop: 2 }}>
              <button type="button" className="cds-btn" onClick={backToList} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="cds-btn cds-btn--primary" disabled={loading}>
                {loading ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Fragment>
  );
};

export default WithdrawalRequestForm;
