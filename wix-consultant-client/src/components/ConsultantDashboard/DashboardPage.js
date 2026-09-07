import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { HiOutlineUsers, HiOutlineUserGroup, HiOutlineBanknotes, HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import { getConsultantId } from "../../utils/wixStorage";
import { formatCurrency } from "../Helper/Helper";

/**
 * Consultant overview.
 *
 * Data: GET /api/api-consultant/get/consultant/:id returns ConsultantClient
 * records with `userId` populated (fullname, email, isActive). That model has
 * no consultation status or `isRequest` field, so the list below is presented
 * for what it is — the consultant's clients — rather than as consultations.
 * Revenue is the wallet balance from the consultant record. Nothing invented.
 */
const DashboardPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [clients, setClients] = useState(null); // null = loading
  const { consultantOverview } = useSelector((state) => state.consultants);
  const { voucherData } = useSelector((state) => state.users);
  const token = localStorage.getItem("token");
  const currency = voucherData?.shopCurrency || "";

  useEffect(() => {
    setUserId(getConsultantId());
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/get/consultant/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!cancelled) setClients(Array.isArray(response.data?.payload) ? response.data.payload : []);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("shop");
          window.top.location.href = `${process.env.REACT_APP_FRONTEND_HOST}/login`;
          return;
        }
        if (!cancelled) setClients([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const consultant = consultantOverview?.consultant;
  const firstName = (consultant?.fullname || "").split(" ")[0];
  const loading = clients === null;
  const list = useMemo(() => clients || [], [clients]);
  const activeClients = useMemo(() => list.filter((c) => c?.userId?.isActive).length, [list]);
  const recent = useMemo(() => list.slice(0, 8), [list]);

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

  const initials = (name) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("") || "?";

  return (
    <div className="cds-page">
      <header className="cds-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>
            {firstName ? `Welcome back, ${firstName}. ` : "Welcome back. "}
            Here is your consultation activity.
          </p>
        </div>
        <button
          type="button"
          className="cds-btn cds-btn--primary"
          onClick={() => navigate(`/consultant-dashboard/chats${window.location.search}`)}
        >
          <HiOutlineChatBubbleLeftRight />
          Open chats
        </button>
      </header>

      <section className="cds-metrics" aria-label="Overview">
        <div className="cds-metric">
          <div>
            <div className="cds-metric-label">Total clients</div>
            <div className="cds-metric-value">
              {loading ? <span className="cds-skeleton" /> : list.length}
            </div>
            <div className="cds-metric-sub">Clients who have contacted you</div>
          </div>
          <span className="cds-metric-icon" aria-hidden="true"><HiOutlineUsers /></span>
        </div>

        <div className="cds-metric">
          <div>
            <div className="cds-metric-label">Active clients</div>
            <div className="cds-metric-value">
              {loading ? <span className="cds-skeleton" /> : activeClients}
            </div>
            <div className="cds-metric-sub">With an active account</div>
          </div>
          <span className="cds-metric-icon" aria-hidden="true"><HiOutlineUserGroup /></span>
        </div>

        <div className="cds-metric">
          <div>
            <div className="cds-metric-label">Wallet balance</div>
            <div className="cds-metric-value">
              {consultant ? formatCurrency(currency, consultant.walletBalance) : <span className="cds-skeleton" />}
            </div>
            <div className="cds-metric-sub">Available to withdraw</div>
          </div>
          <span className="cds-metric-icon cds-metric-icon--success" aria-hidden="true"><HiOutlineBanknotes /></span>
        </div>
      </section>

      <section className="cds-card" aria-label="Recent clients">
        <div className="cds-card-head">
          <div>
            <h2>Recent clients</h2>
            <p>People who have started a consultation with you.</p>
          </div>
        </div>

        {loading ? (
          <div className="cds-loading" role="status">
            <span className="cds-spinner" aria-hidden="true" />
            Loading clients…
          </div>
        ) : recent.length === 0 ? (
          <div className="cds-empty">
            <span className="cds-empty-icon" aria-hidden="true"><HiOutlineUsers /></span>
            <div className="cds-empty-title">No clients yet</div>
            <div className="cds-empty-text">
              Clients will appear here once you receive your first consultation request.
            </div>
          </div>
        ) : (
          <div className="cds-table-wrap">
            <table className="cds-table--cards">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Since</th>
                  <th>Account</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => {
                  const user = row?.userId || {};
                  return (
                    <tr key={row._id}>
                      <td data-label="Client">
                        <div className="cds-entity">
                          <span className="cds-avatar" aria-hidden="true">{initials(user.fullname)}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className="cds-entity-name">{user.fullname || "—"}</div>
                            {user.email && <div className="cds-entity-sub">{user.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td data-label="Since" className="cds-muted">{formatDate(row.createdAt)}</td>
                      <td data-label="Account">
                        <span className={`cds-pill ${user.isActive ? "cds-pill--success" : ""}`}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
