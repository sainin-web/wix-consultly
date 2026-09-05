import React, { Fragment, useCallback, useEffect, useState } from "react";
import IndexTableList from "../components/consultant-list/IndexTableList";
import { Page, Layout, Button, Badge, InlineStack, IndexTable, Text, Tooltip } from "@shopify/polaris";
import { EditIcon } from "@shopify/polaris-icons";
import { fetchWalletHistory, fetchAdminDetails } from "../components/Redux/slices/adminSlice";
import { useDispatch, useSelector } from "react-redux";
import UpdateUserDetailsModal from "./UpdateUserDetailsModal";
import axios from "axios";
import { getWixAdminToken } from "../utils/getWixAdminToken";
import { usePolarisToast } from "../components/AlertModel/PolariesTostContext";
import { formatCurrency, humanizeStatus, statusTone } from "../components/Helper/Helper";

const headings = [
  { title: "User" },
  { title: "Transaction" },
  { title: "Amount" },
  { title: "Status" },
  { title: "Date" },
  { title: "", alignment: "end" },
];

function ManualDebetCreditBlance() {
  const { walletHistory, loading: walletLoading, adminDetails_ } = useSelector((state) => state.admin);
  const dispatch = useDispatch();
  const { showToast } = usePolarisToast();
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const [page, setPage] = useState(1);
  const [active, setActive] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [updateFormData, setUpdateFormData] = useState({
    userId: "",
    mainType: "",
    amount: "",
    description: "",
  });
  const limit = 10;
  const currency = adminDetails_?.currency || "";

  const openUpdateWalletModal = (userId, fullname) => {
    setUpdateFormData({ userId: "", mainType: "", amount: "", description: "" });
    setUserDetails({ userId, fullname });
    setActive(true);
  };

  useEffect(() => {
    setAdminIdLocal(localStorage.getItem("wix_id"));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("wix_access_token");
    dispatch(fetchWalletHistory({ adminIdLocal, page, limit, searchQuery, token }));
    dispatch(fetchAdminDetails({ adminIdLocal, token }));
  }, [dispatch, adminIdLocal, page, limit, refresh, searchQuery]);

  const updateWallet = async () => {
    const token = await getWixAdminToken();
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/admin/update-wallet/${adminIdLocal}`,
        { ...updateFormData, userId: userDetails.userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.success === true) {
        setRefresh((prev) => !prev);
        showToast(response.data?.message || "Wallet updated.");
        return true;
      }
      showToast(response.data?.message || "Could not update the wallet.", true);
      return false;
    } catch (error) {
      showToast(error.response?.data?.message || "Could not update the wallet.", true);
      return false;
    }
  };

  const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

  const tableData =
    walletHistory?.data?.map((item) => ({
      id: item?._id,
      userId: item?.userId?._id,
      fullname: item?.userId?.fullname || "—",
      userType: item?.userId?.userType || "",
      amount: item?.amount || 0,
      transactionType: item?.transactionType || "",
      referenceType: item?.referenceType || "",
      direction: item?.direction || "",
      status: item?.status || "",
      description: item?.description || "",
      createdAt: formatDate(item?.createdAt || item?.updatedAt),
    })) || [];

  const onHandleCancel = () => {
    setPage(1);
    setSearchQuery("");
    return true;
  };

  const renderWalletRow = useCallback(
    (wallet, index) => {
      const { id, userId, fullname, userType, amount, transactionType, referenceType, direction, status, description, createdAt } = wallet;
      const isCredit = direction === "credit";
      return (
        <IndexTable.Row id={id} key={id} position={index}>
          <IndexTable.Cell>
            <div style={{ minWidth: 0 }}>
              <div className="saas-entity-name">{fullname}</div>
              {userType && <div className="saas-entity-sub">{humanizeStatus(userType)}</div>}
            </div>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <div style={{ minWidth: 0 }}>
              <div>
                {humanizeStatus(transactionType)}
                {referenceType ? ` · ${humanizeStatus(referenceType)}` : ""}
              </div>
              {description && <div className="saas-entity-sub">{description}</div>}
            </div>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" numeric fontWeight="semibold" tone={isCredit ? "success" : "critical"}>
              {isCredit ? "+" : "−"}
              {formatCurrency(currency, amount)}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Badge tone={statusTone(status)}>{humanizeStatus(status)}</Badge>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" variant="bodyMd">{createdAt}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <InlineStack align="end">
              <Tooltip content="Adjust balance">
                <Button
                  variant="tertiary"
                  icon={EditIcon}
                  accessibilityLabel="Adjust wallet balance"
                  onClick={(e) => {
                    e.stopPropagation();
                    openUpdateWalletModal(userId, fullname);
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
      <UpdateUserDetailsModal
        open={active}
        onClose={() => setActive(false)}
        userDetails={userDetails}
        updateFormData={updateFormData}
        setUpdateFormData={setUpdateFormData}
        updateWallet={updateWallet}
        currency={currency}
      />
      <Page
        title="Wallet Management"
        subtitle="Every credit and debit across customer and consultant wallets."
      >
        <Layout>
          <Layout.Section>
            <IndexTableList
              itemStrings={[]}
              sortOptions={[]}
              data={tableData}
              headings={headings}
              renderRow={renderWalletRow}
              resourceName={{ singular: "transaction", plural: "transactions" }}
              queryPlaceholder="Search by user"
              onQueryChange={(value) => {
                setSearchQuery(value);
                setPage(1);
              }}
              page={page}
              setPage={setPage}
              limit={limit}
              totalItems={walletHistory?.totalItems || walletHistory?.data?.length || 0}
              loading={walletLoading}
              onHandleCancel={onHandleCancel}
              emptyTitle="No wallet activity yet"
              emptyDescription="Recharges, consultation charges and manual adjustments will appear here."
            />
          </Layout.Section>
        </Layout>
      </Page>
    </Fragment>
  );
}

export default ManualDebetCreditBlance;
