import React, { useEffect, useState } from "react";
import UserTable from "../components/ClientDashbord/UserTable";
import axios from "axios";
import { getDuration } from "../components/Helper/Helper";
import { useDispatch, useSelector } from "react-redux";
import { fetchVoucherData } from "../components/Redux/slices/UserSlices";
import { getCustomerId } from "../utils/wixStorage";

function CallChatLogs() {
  const [callChatLogs, setCallChatLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [shopId, setShopId] = useState(null);
  const dispatch = useDispatch();
  const { voucherData } = useSelector((state) => state.users);

  useEffect(() => {
    const userId = getCustomerId();
    setUserId(userId);
    const shopId = localStorage.getItem("wix_id");
    setShopId(shopId);
  }, []);

  const columns = [
    {
      label: "Consultant Name",
      key: "consultantName",
      // Assuming consultant is the receiver; change to senderId if needed
      render: (row) => row.consultant?.fullname || "-",
    },
    {
      label: "Amount",
      key: "amount",
      render: (row) => `${voucherData?.shopCurrency}${row.amount.toFixed(2)}`,
    },
    {
      label: "Date & Time",
      key: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      label: "Type",
      key: "type",
      render: (row) => row.type ?? "-",
    },
    {
      label: "Duration",
      key: "duration",
      render: (row) => getDuration(row.startTime, row.endTime) + "min",
    },
    {
      label: "Status",
      key: "status",
      render: (row) => row.status ?? "-",
    },
  ];

  useEffect(() => {
    if (shopId) {
      
      dispatch(fetchVoucherData(shopId));
    }
  }, [shopId]);
  useEffect(() => {
    if (userId && shopId) {
      const token = localStorage.getItem("token");
      console.log("token", token);
      const getCallChatLogs = async () => {
        try {
          setLoading(true);
          const response = await axios.get(
            `${process.env.REACT_APP_BACKEND_HOST}/api/users/find-user-logs-history/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          setCallChatLogs(response.data.data || []);
        } catch (error) {
          console.error("Error fetching call/chat logs:", error);
          setCallChatLogs([]);
        } finally {
          setLoading(false);
        }
      };
      getCallChatLogs();
    }
  }, [userId, shopId]);
  console.log("callChatLogs", callChatLogs);

  return (
    <UserTable
      title="Call /- Chat Logs_"
      columns={columns}
      data={callChatLogs}
      loading={loading}
    />
  );
}

export default CallChatLogs;
