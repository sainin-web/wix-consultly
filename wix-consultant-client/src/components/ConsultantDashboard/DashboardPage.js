import React, { use, useEffect, useState } from "react";
import styles from "../../components/ConsultantDashboard/DashboardPage.module.css";
import { useSelector } from "react-redux";
import axios from "axios";

const DashboardPage = () => {
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [shopId, setShopId] = useState(null);
  const { consultantOverview } = useSelector((state) => state.consultants);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const storedUserId =
      localStorage.getItem("wix_c_Identity") 
    const storedShopId = localStorage.getItem("wix_id");
    setUserId(storedUserId);
    setShopId(storedShopId);
  }, []);

  const stats = {
    totalClients: 124,
    activeConsultations: 18,
    monthlyRevenue: 45200,
    averageRating: 4.8,
  };

  const getStatusBadge = (status) => {
    const badges = {
      true: styles.badgeSuccess,
      false: styles.badgeSecondary,
    };
    return badges[status] || styles.badgeSecondary;
  };

  const getLatestUser = async () => {
    if (!userId) return console.log("userId not found");
 
    try {
      const url = `${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/get/consultant/${userId}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.data;
      setUserData(data?.payload);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log("error", error);
        localStorage.removeItem("token");
        localStorage.removeItem("shop");
        window.top.location.href = `${process.env.REACT_APP_FRONTEND_HOST}/login`;
      }
      return "Consultant";
    }
  };
  useEffect(() => {
    getLatestUser();
  }, [userId]);
  const formatAmount = (num) => {
    if (!num) return "0";

    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";

    return Number(num.toFixed(2)).toString();
  };


  return (
    <div className={styles.pageContainer}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <h1 onClick={() => getLatestUser()} className={styles.pageTitle}>
          Dashboard Overview
        </h1>
        <p className={styles.pageDescription}>
          Welcome back! Here's what's happening with your consultancy today.
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardBody}>
            <div
              className={`${styles.statHeader} ${styles.flexBetween} ${styles.flexStart}`}
            >
              <div>
                <p className={styles.statLabel}>Total Clients</p>
                <h3 className={styles.statValue}>{userData?.length || 0}</h3>
              </div>
              <div
                className={styles.statIcon}
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>
            <div
              className={`${styles.statFooter} ${styles.flex} ${styles.flexCenter}`}
            >
              <span
                className={`${styles.statChange} ${styles.statChangeSuccess}`}
                style={{ fontSize: "13px", fontWeight: "600" }}
              >
               
              </span>
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardBody}>
            <div
              className={`${styles.statHeader} ${styles.flexBetween} ${styles.flexStart}`}
            >
              <div>
                <p className={styles.statLabel}>Active Clients</p>
                <h3 className={styles?.statValue || styles.statValue}>
                  {userData?.filter(
                    (consultation) => consultation?.userId?.isActive,
                  ).length || 0}
                </h3>
              </div>
              <div
                className={styles.statIcon}
                style={{
                  background:
                    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
            </div>
            <div
              className={`${styles.statFooter} ${styles.flex} ${styles.flexCenter}`}
            >
              <span
                className={`${styles.statChange} ${styles.textPrimary}`}
                style={{ fontSize: "13px", fontWeight: "600" }}
              >
                {/* <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline', marginRight: '4px' }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg> */}
                {/* 8 pending reviews */}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardBody}>
            <div
              className={`${styles.statHeader} ${styles.flexBetween} ${styles.flexStart}`}
            >
              <div>
                <p className={styles.statLabel}>Total Revenue</p>
                <h3 className={styles.statValue}>
                  $
                  {consultantOverview?.consultant?.walletBalance
                    ? formatAmount(
                        consultantOverview?.consultant?.walletBalance,
                      )
                    : ""}
                </h3>
              </div>
              <div
                className={styles.statIcon}
                style={{
                  background:
                    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <div
              className={`${styles.statFooter} ${styles.flex} ${styles.flexCenter}`}
            >
              <span
                className={`${styles.statChange} ${styles.statChangeSuccess}`}
                style={{ fontSize: "13px", fontWeight: "600" }}
              >

              </span>
            </div>
          </div>
        </div>

       
      </div>

      {/* Recent Consultations */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardBody}>
          <div
            className={`${styles.tableHeader} ${styles.flexBetween} ${styles.flexCenter}`}
          >
            <div>
              <h5 className={styles.tableTitle}>Recent Consultations</h5>
              <p className={styles.tableSubtitle}>
                Latest client interactions and consultations
              </p>
            </div>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeadCell}>Client</th>
                  <th className={styles.tableHeadCell}>Type</th>
                  <th className={styles.tableHeadCell}>Date</th>
                  <th className={styles.tableHeadCell}>Status</th>
                  <th
                    className={`${styles.tableHeadCell} ${styles.tableHeadCellRight}`}
                  >
                    isRequest
                  </th>
                  {/* <th className={`${styles.tableHeadCell} ${styles.tableHeadCellRight}`}>Action</th> */}
                </tr>
              </thead>
              <tbody>
                {userData?.map((consultation) => {
                  console.log("Consultation Record:", consultation);
                  return (
                    <tr key={consultation._id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <div
                          className={`${styles.userInfo} ${styles.flex} ${styles.flexCenter}`}
                        >
                          <div className={styles.userAvatar}>
                            {consultation?.userId?.fullname
                              ?.split(" ")
                              ?.map((n) => n[0])
                              ?.join("") || ""}
                          </div>
                          <div>
                            <div className={styles.userName}>
                              {consultation?.userId?.fullname || "-"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td
                        className={styles.tableCell}
                        style={{ fontSize: "14px", color: "#6c757d" }}
                      >
                        {consultation?.userId?.userType || "-"}
                      </td>

                      <td
                        className={styles.tableCell}
                        style={{ fontSize: "14px", color: "#6c757d" }}
                      >
                        {new Date(consultation.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </td>

                      <td className={styles.tableCell}>
                        <span
                          className={`${styles.badge} ${getStatusBadge(
                            consultation?.userId?.isActive,
                          )}`}
                        >
                          {consultation?.userId?.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td
                        className={`${styles.tableCell} ${styles.tableCellRight} ${styles.amount}`}
                      >
                        {consultation?.userId?.isRequest
                          ? "Request"
                          : "listed"}
                      </td>

                      {/* <td
                                                    className={`${styles.tableCell} ${styles.tableCellRight}`}
                                                >
                                                    <button className={styles.viewButton}>View</button>
                                                </td> */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
