import React, { Fragment, useCallback, useContext, useEffect, useState } from "react";
import IndexTableList from "../components/consultant-list/IndexTableList";
import { Page, Layout, Button, Badge, InlineStack, IndexTable, Text, Tooltip } from "@shopify/polaris";
import { fetchWithdrawalRequests, fetchAdminDetails } from "../components/Redux/slices/adminSlice";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { getWixAdminToken } from "../utils/getWixAdminToken";
import WidthrwalRequestApprove from "../components/AlertModel/WidthrwalRequestApprove";
import { ToastContext } from "../components/AlertModel/PolariesTostContext";
import { WidthrawalReqDeclineAlert } from "../components/AlertModel/WidthrawalReqDeclineAlert";
import { XIcon, PaymentIcon } from "@shopify/polaris-icons";
import { formatCurrency, humanizeStatus, statusTone } from "../components/Helper/Helper";

const headings = [
  { title: "Consultant" },
  { title: "Amount" },
  { title: "Requested" },
  { title: "Status" },
  { title: "Note" },
  { title: "", alignment: "end" },
];

function WithdrawalRequest() {
  const { showToast } = useContext(ToastContext);
  const dispatch = useDispatch();
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const [page, setPage] = useState(1);
  const [active, setActive] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeclineVisible, setIsDeclineVisible] = useState(false);
  const [selectedWithdrawalRequestId, setSelectedWithdrawalRequestId] = useState(null);
  const { adminDetails_, withdrawalRequests, loading: withdrawalRequestsLoading } = useSelector(
    (state) => state.admin,
  );
  const [updateFormData, setUpdateFormData] = useState({
    userId: "",
    transactionId: "",
    mainType: "",
    amount: "",
    description: "",
    transactionNumber: "",
  });
  const limit = 10;
  const currency = adminDetails_?.currency || "";

  const openApproveModal = (row) => {
    setActive(true);
    setUserDetails({
      userId: row.userId,
      fullname: row.fullname,
      shop_Id: row.shop_id,
      amount: row.amount,
      status: row.status,
      description: row.description,
      id: row.id,
    });
  };

  useEffect(() => {
    setAdminIdLocal(localStorage.getItem("wix_id"));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("wix_access_token");
    dispatch(fetchAdminDetails({ adminIdLocal, token }));
    dispatch(fetchWithdrawalRequests({ adminIdLocal, page, limit, searchQuery, token }));
  }, [dispatch, adminIdLocal, page, limit, refresh, searchQuery]);

  const updateWallet = async () => {
    const token = await getWixAdminToken();
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_HOST}/api/admin/update/widthrwal/req/${adminIdLocal}`,
        { ...updateFormData, userId: userDetails.userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setActive(false);
      if (response.data.success === true) {
        setRefresh((prev) => !prev);
        showToast(response.data?.message);
      } else {
        showToast(response.data?.message, true);
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Could not approve the request.", true);
    }
  };

  const openDeclineModal = (withdrawalRequestId) => {
    setSelectedWithdrawalRequestId(withdrawalRequestId);
    setIsDeclineVisible(true);
  };

  const handleDecline = async (withdrawalRequestId) => {
    const token = await getWixAdminToken();
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_HOST}/api/admin/declin/widthrwal/req/${withdrawalRequestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setIsDeclineVisible(false);
      if (response.data.success === true) {
        showToast(response.data.message);
        setRefresh((prev) => !prev);
      } else {
        showToast(response.data.message, true);
      }
    } catch (error) {
      setIsDeclineVisible(false);
      showToast(error.response?.data?.message || "Could not decline the request.", true);
    }
  };

  const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

  const tableData =
    withdrawalRequests?.data?.map((item) => ({
      id: item?._id,
      userId: item?.consultantId?._id,
      shop_id: item?.shopId || "",
      fullname: item?.consultantId?.fullname || "—",
      email: item?.consultantId?.email || "",
      amount: item?.amount || 0,
      status: item?.status || "pending",
      description: item?.note || "",
      createdAt: formatDate(item?.createdAt),
    })) || [];

  const onHandleCancel = () => {
    setPage(1);
    setSearchQuery("");
    return true;
  };

  const renderRow = useCallback(
    (row, index) => {
      const { id, fullname, email, amount, status, description, createdAt } = row;
      const isPending = String(status).toLowerCase() === "pending";
      return (
        <IndexTable.Row id={id} key={id} position={index}>
          <IndexTable.Cell>
            <div style={{ minWidth: 0 }}>
              <div className="saas-entity-name">{fullname}</div>
              {email && <div className="saas-entity-sub">{email}</div>}
            </div>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" numeric fontWeight="semibold">{formatCurrency(currency, amount)}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" variant="bodyMd">{createdAt}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Badge tone={statusTone(status)}>{humanizeStatus(status)}</Badge>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" variant="bodyMd" tone="subdued">{description || "—"}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <InlineStack align="end" gap="100" wrap={false}>
              <Tooltip content={isPending ? "Approve and mark paid" : "Already processed"}>
                <Button
                  variant="tertiary"
                  icon={PaymentIcon}
                  accessibilityLabel="Approve withdrawal request"
                  disabled={!isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    openApproveModal(row);
                  }}
                />
              </Tooltip>
              <Tooltip content={isPending ? "Decline" : "Already processed"}>
                <Button
                  variant="tertiary"
                  tone="critical"
                  icon={XIcon}
                  accessibilityLabel="Decline withdrawal request"
                  disabled={!isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeclineModal(id);
                  }}
                />
              </Tooltip>
            </InlineStack>
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency],
  );

  return (
    <Fragment>
      <WidthrawalReqDeclineAlert
        isWidthrawalReqDeclineAlertVisible={isDeclineVisible}
        setIsWidthrawalReqDeclineAlertVisible={setIsDeclineVisible}
        handleDecline={handleDecline}
        withdrawalRequestId={selectedWithdrawalRequestId}
      />
      <WidthrwalRequestApprove
        open={active}
        onClose={() => setActive(false)}
        userDetails={userDetails}
        updateFormData={updateFormData}
        setUpdateFormData={setUpdateFormData}
        updateWallet={updateWallet}
        currency={currency}
      />
      <Page
        title="Withdrawal Requests"
        subtitle="Review consultant payout requests and mark them paid or declined."
      >
        <Layout>
          <Layout.Section>
            <IndexTableList
              itemStrings={[]}
              sortOptions={[]}
              data={tableData}
              headings={headings}
              renderRow={renderRow}
              resourceName={{ singular: "withdrawal request", plural: "withdrawal requests" }}
              queryPlaceholder="Search by consultant"
              onQueryChange={(value) => {
                setSearchQuery(value);
                setPage(1);
              }}
              page={page}
              setPage={setPage}
              limit={limit}
              totalItems={withdrawalRequests?.totalItems || withdrawalRequests?.data?.length || 0}
              loading={withdrawalRequestsLoading}
              onHandleCancel={onHandleCancel}
              emptyTitle="No withdrawal requests"
              emptyDescription="Requests from consultants will appear here."
            />
          </Layout.Section>
        </Layout>
      </Page>
    </Fragment>
  );
}

export default WithdrawalRequest;
