import axios from "axios";
import React, { useEffect, useState } from "react";
import UserTable from "../ClientDashbord/UserTable";
import { getDuration } from "../Helper/Helper";
import { fetchVoucherData } from "../Redux/slices/UserSlices";
import { useDispatch, useSelector } from "react-redux";
import { useOutletContext } from "react-router-dom";

const CallLogsConsultant = () => {
  const [callLogsConsultant, setCallLogsConsultant] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [shopId, setShopId] = useState(null);
  const dispatch = useDispatch();
  const { voucherData } = useSelector((state) => state.users);
  const { shop } = useOutletContext();
  console.log("userId", userId);
  const columns = [
    {
      label: "User Name",
      key: "consultantName",
      render: (row) => row.user?.fullname || "-",
    },
    {
      label: "Amount",
      key: "amount",
      render: (row) =>
        `${voucherData?.shopCurrency}${row.consultantAmount.toFixed(2)}`,
    },
    {
      label: "Date & Time",
      key: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      label: "Type",
      key: "type",
      // render: row => row.type ?? "-",
    },
    {
      label: "Duration",
      key: "duration",
      render: (row) => getDuration(row.startTime, row.endTime) + " min",
    },
    {
      label: "Status",
      key: "status",
      render: (row) => row.status ?? "-",
    },
  ];

  useEffect(() => {
    const userId = localStorage.getItem("wix_c_Identity");
    setUserId(userId);
    const shopId = localStorage.getItem("wix_id");
    setShopId(shopId);
  }, []);
  useEffect(() => {
    if (shopId) {
      dispatch(fetchVoucherData(shopId));
    }
  }, [shopId]);

  useEffect(() => {
    if (userId && shopId) {
      const token = localStorage.getItem("token");
      const getCallLogsConsultant = async () => {
        try {
          setLoading(true);
          const response = await axios.get(
            `${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/find-user-chat-logs/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          console.log("response", response);
          if (response.status === 200) {
            setCallLogsConsultant(response.data.data || []);
            setLoading(false);
          }
        } catch (error) {
          if (error.response && error.response.status === 401) {
            console.log("error", error);
            localStorage.removeItem("token");
            localStorage.removeItem("shop");
            window.top.location.href = `${process.env.REACT_APP_FRONTEND_HOST}/login`;
          }
          console.error("Error fetching call logs consultant:", error);
          setCallLogsConsultant([]);
        } finally {
          setLoading(false);
        }
      };
      getCallLogsConsultant();
    }
  }, [userId, shopId]);

  return (
    <div>
      <UserTable
        title="Call / Chat Logs_"
        columns={columns}
        data={callLogsConsultant}
        loading={loading}
      />
    </div>
  );
};

export default CallLogsConsultant;
