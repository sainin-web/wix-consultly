import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { HiOutlineArrowDownTray } from "react-icons/hi2";
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

/** GET /api/api-consultant/find/consultant/withdrawal/request/:consultantId — unchanged. */
const WithdrawalRequestTable = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [shopId, setShopId] = useState(null);
  const dispatch = useDispatch();
  const { voucherData } = useSelector((state) => state.users);
  const token = localStorage.getItem("token");
  const currency = voucherData?.shopCurrency || "";

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
          `${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/find/consultant/withdrawal/request/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!cancelled && response.status === 200) setRequests(response.data.data || []);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("shop");
          window.top.location.href = `${process.env.REACT_APP_FRONTEND_HOST}/login`;
          return;
        }
        if (!cancelled) setRequests([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, shopId]);

  const goToForm = () => navigate(`/consultant-dashboard/withdrawal-request${window.location.search}`);

  const columns = [
    {
      label: "Amount",
      key: "amount",
      className: "cds-num",
      render: (row) => <span className="cds-strong">{formatCurrency(currency, row.amount)}</span>,
    },
    {
      label: "Requested",
      key: "createdAt",
      className: "cds-muted",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
          : "—",
    },
    {
      label: "Status",
      key: "status",
      render: (row) => <span className={toneClass(row.status)}>{humanizeStatus(row.status)}</span>,
    },
    {
      label: "Reference",
      key: "transactionNumber",
      className: "cds-muted",
      render: (row) => row.transactionNumber || "—",
    },
    {
      label: "Note",
      key: "note",
      className: "cds-muted",
      render: (row) => row.note || "—",
    },
  ];

  const requestButton = (
    <button type="button" className="cds-btn cds-btn--primary" onClick={goToForm}>
      <HiOutlineArrowDownTray />
      Request withdrawal
    </button>
  );

  return (
    <div className="cds-page">
      <header className="cds-page-head">
        <div>
          <h1>Withdrawals</h1>
          <p>Track payout requests and their status.</p>
        </div>
        {requestButton}
      </header>

      <UserTable
        columns={columns}
        data={requests}
        loading={loading}
        emptyIcon={<HiOutlineArrowDownTray />}
        emptyTitle="No withdrawal requests"
        emptyText="Request a payout from your wallet balance and it will be listed here."
      />
    </div>
  );
};

export default WithdrawalRequestTable;
