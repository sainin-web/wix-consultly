import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { HiOutlineBanknotes, HiOutlineArrowDownTray } from "react-icons/hi2";
import UserTable from "../ClientDashbord/UserTable";
import { fetchVoucherData } from "../Redux/slices/UserSlices";
import { getConsultantId } from "../../utils/wixStorage";
import { formatCurrency, humanizeStatus, statusTone } from "../Helper/Helper";

const toneClass = (status) => {
  const tone = statusTone(status);
  if (tone === "success") return "cds-pill cds-pill--success";
  if (tone === "attention") return "cds-pill cds-pill--warning";
  if (tone === "critical") return "cds-pill cds-pill--danger";
  return "cds-pill";
};

/** GET /api/api-consultant/find-consultant/wallet/history/:userId/:shopId — unchanged. */
const ConsultantWalletLogs = () => {
  const navigate = useNavigate();
  const [walletLogs, setWalletLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [shopId, setShopId] = useState(null);
  const dispatch = useDispatch();
  const { voucherData } = useSelector((state) => state.users);
  const { consultantOverview } = useSelector((state) => state.consultants);
  const token = localStorage.getItem("token");
  const currency = voucherData?.shopCurrency || "";
  const balance = consultantOverview?.consultant?.walletBalance;

  useEffect(() => {
    setUserId(getConsultantId());
    setShopId(localStorage.getItem("wix_id"));
  }, []);

  useEffect(() => {
    if (shopId) dispatch(fetchVoucherData(shopId));
  }, [dispatch, shopId]);

  useEffect(() => {
    if (!userId || !shopId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/find-consultant/wallet/history/${userId}/${shopId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!cancelled && response.status === 200) setWalletLogs(response.data.data || []);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("shop");
          window.top.location.href = `${process.env.REACT_APP_FRONTEND_HOST}/login`;
          return;
        }
        if (!cancelled) setWalletLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, shopId]);

  const goToWithdraw = () => navigate(`/consultant-dashboard/withdrawal-request${window.location.search}`);

  const columns = [
    {
      label: "Transaction",
      key: "transactionType",
      render: (row) => (
        <div style={{ minWidth: 0 }}>
          <div className="cds-strong">{humanizeStatus(row.transactionType)}</div>
          {(row.description || row.referenceType) && (
            <div className="cds-entity-sub">{row.description || humanizeStatus(row.referenceType)}</div>
          )}
        </div>
      ),
    },
    {
      label: "Amount",
      key: "amount",
      className: "cds-num",
      render: (row) => {
        const credit = row.direction === "credit";
        return (
          <span className={credit ? "cds-plus" : "cds-minus"}>
            {credit ? "+" : "−"}
            {formatCurrency(currency, row.amount)}
          </span>
        );
      },
    },
    {
      label: "Status",
      key: "status",
      render: (row) => <span className={toneClass(row.status)}>{humanizeStatus(row.status)}</span>,
    },
    {
      label: "Date",
      key: "createdAt",
      className: "cds-muted",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
          : "—",
    },
  ];

  return (
    <div className="cds-page">
      <header className="cds-page-head">
        <div>
          <h1>Wallet</h1>
          <p>Your earnings, payouts and adjustments.</p>
        </div>
      </header>

      <div className="cds-balance">
        <div>
          <div className="cds-balance-label">Available balance</div>
          <div className="cds-balance-value">
            {consultantOverview ? formatCurrency(currency, balance) : "…"}
          </div>
        </div>
        <button type="button" className="cds-btn cds-btn--on-dark" onClick={goToWithdraw}>
          <HiOutlineArrowDownTray />
          Withdraw funds
        </button>
      </div>

      <UserTable
        title="Recent transactions"
        subtitle="Credits from sessions and debits from payouts."
        columns={columns}
        data={walletLogs}
        loading={loading}
        emptyIcon={<HiOutlineBanknotes />}
        emptyTitle="No transactions yet"
        emptyText="Earnings from your consultations will appear here."
      />
    </div>
  );
};

export default ConsultantWalletLogs;
