import axios from "axios";
import React, { useEffect, useState } from "react";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import UserTable from "../ClientDashbord/UserTable";
import { formatCurrency, getDuration, humanizeStatus, statusTone } from "../Helper/Helper";
import { fetchVoucherData } from "../Redux/slices/UserSlices";
import { useDispatch, useSelector } from "react-redux";
import { getConsultantId } from "../../utils/wixStorage";

const TYPE_LABEL = { chat: "Chat", voice: "Audio call", video: "Video call" };

const toneClass = (status) => {
  const tone = statusTone(status);
  if (tone === "success") return "cds-pill cds-pill--success";
  if (tone === "attention") return "cds-pill cds-pill--warning";
  if (tone === "critical") return "cds-pill cds-pill--danger";
  return "cds-pill";
};

/** GET /api/api-consultant/find-user-chat-logs/:id — unchanged. */
const CallLogsConsultant = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [shopId, setShopId] = useState(null);
  const dispatch = useDispatch();
  const { voucherData } = useSelector((state) => state.users);
  const currency = voucherData?.shopCurrency || "";

  useEffect(() => {
    setUserId(getConsultantId());
    setShopId(localStorage.getItem("wix_id"));
  }, []);

  useEffect(() => {
    if (shopId) dispatch(fetchVoucherData(shopId));
  }, [dispatch, shopId]);

  useEffect(() => {
    if (!userId) return;
    const token = localStorage.getItem("token");
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/find-user-chat-logs/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!cancelled && response.status === 200) setLogs(response.data.data || []);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("shop");
          window.top.location.href = `${process.env.REACT_APP_FRONTEND_HOST}/login`;
          return;
        }
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const columns = [
    {
      label: "Client",
      key: "client",
      render: (row) => <span className="cds-strong">{row.user?.fullname || "—"}</span>,
    },
    {
      label: "Type",
      key: "type",
      render: (row) => TYPE_LABEL[row.type] || humanizeStatus(row.type),
    },
    {
      label: "Date",
      key: "createdAt",
      className: "cds-muted",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
    },
    {
      label: "Duration",
      key: "duration",
      className: "cds-num",
      render: (row) => (row.startTime && row.endTime ? `${getDuration(row.startTime, row.endTime)} min` : "—"),
    },
    {
      label: "Earned",
      key: "consultantAmount",
      className: "cds-num",
      render: (row) => <span className="cds-strong">{formatCurrency(currency, row.consultantAmount)}</span>,
    },
    {
      label: "Status",
      key: "status",
      render: (row) => <span className={toneClass(row.status)}>{humanizeStatus(row.status)}</span>,
    },
  ];

  return (
    <div className="cds-page">
      <header className="cds-page-head">
        <div>
          <h1>Call logs</h1>
          <p>Every chat, audio and video session with your clients.</p>
        </div>
      </header>
      <UserTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyIcon={<HiOutlineClipboardDocumentList />}
        emptyTitle="No sessions yet"
        emptyText="Completed chats and calls will be listed here with their duration and earnings."
      />
    </div>
  );
};

export default CallLogsConsultant;
