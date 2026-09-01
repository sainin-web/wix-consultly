import React, { Fragment, useState, useCallback, useEffect } from "react";
import {
  Page,
  Layout,
  IndexTable,
  Text,
  Button,
  InlineStack,
} from "@shopify/polaris";
import IndexTableList from "../components/consultant-list/IndexTableList";
import { DeleteIcon, EditIcon, PlusIcon } from "@shopify/polaris-icons";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminDetails } from "../components/Redux/slices/adminSlice";
import { VoucherDeleteAlert } from "../components/AlertModel/VoucherDeleteAlert";
import axios from "axios";
import { getWixAdminToken } from "../utils/getWixAdminToken";
import { useNavigate } from "react-router-dom";

function VoucherTable() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  // useState returns [state, setState] — assign only the first element, or use a plain array.
  const headings = [
    { title: "Sr. No.", alignment: "start" },
    { title: "Voucher Code", alignment: "center" },
    { title: "Total Amount", alignment: "center" },
    { title: "Extra Amount", alignment: "center" },
    { title: "Action", alignment: "center" },
  ];
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const [appToken, setAppToken] = useState(null);
  const [isUserAlertVisible, setIsUserAlertVisible] = useState(false);
  const [voucherId, setVoucherId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reLoadApi, setReLoadApi] = useState(false);
  const { adminDetails_, loading: adminDetailsLoading } = useSelector(
    (state) => state.admin,
  );
  useEffect(() => {
    const id = localStorage.getItem("wix_id");
    setAdminIdLocal(id);
    const appToken = localStorage.getItem("appToken");
    setAppToken(appToken);
  }, []);

  useEffect(() => {
    if (adminIdLocal) {
      dispatch(fetchAdminDetails({ adminIdLocal, appToken }));
    }
  }, [dispatch, adminIdLocal, reLoadApi]);

  useEffect(() => {
    if (
      adminDetails_ &&
      adminDetails_.vouchers &&
      Array.isArray(adminDetails_.vouchers)
    ) {
      const mappedVouchers = adminDetails_?.vouchers?.map((voucher, index) => ({
        id: voucher._id || voucher.id || index + 1,
        voucherCode:
          voucher.voucherCode || `VCH${String(index + 1).padStart(3, "0")}`,
        totalCoin: voucher.totalCoin?.$numberDecimal
          ? parseFloat(voucher.totalCoin.$numberDecimal)
          : voucher.totalCoin || 0,
        extraCoin: voucher.extraCoin?.$numberDecimal
          ? parseFloat(voucher.extraCoin.$numberDecimal)
          : voucher.extraCoin || 0,
        status: voucher.status || "Active",
      }));
      setData(mappedVouchers);
      setTotalItems(mappedVouchers.length);
    }
  }, [adminDetails_]);

  const handleOpenDeleteModal = (id) => {
    setVoucherId(id);
    setIsUserAlertVisible(true);
  };

  const handleConfirmDelete = async (id) => {
    const token = await getWixAdminToken();
    setLoading(true);
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_BACKEND_HOST}/api/admin/delete/voucher/${adminIdLocal}/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 200) {
        setReLoadApi((prev) => !prev);
        setIsUserAlertVisible(false);
        setVoucherId(null);
        setLoading(false);
      } else {
      }
    } catch (error) {
      console.error("Error deleting voucher:", error);
    } finally {
      setLoading(false);
    }
  };
  const goToAddVoucher = () => {
    navigate(`/admin/voucher-management/voucher`);
  };

  const renderVoucherRow = useCallback(
    (voucher, index) => {
      const { id, voucherCode, totalCoin, extraCoin, status } = voucher;

      return (
        <IndexTable.Row id={id} key={id || index} position={index}>
          <IndexTable.Cell>
            <Text
              as="span"
              alignment="start"
              variant="bodyMd"
              fontWeight="bold"
              numeric
            >
              {index + 1}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text variant="bodyMd" as="span" alignment="center">
              {voucherCode || "N/A"}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" alignment="center" numeric>
              {adminDetails_?.currency}
              {totalCoin}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" alignment="center" numeric>
              {adminDetails_?.currency}
              {extraCoin}
            </Text>
          </IndexTable.Cell>

          <IndexTable.Cell>
            <InlineStack align="center" gap="100">
              <Button
                variant="tertiary"
                icon={EditIcon}
                accessibilityLabel="Edit voucher"
                onClick={(e) => {
                  e.stopPropagation();
                  // goToVoucherSettings(id);
                }}
              />
              <Button
                variant="tertiary"
                icon={DeleteIcon}
                tone="critical"
                accessibilityLabel="Delete voucher"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDeleteModal(id);
                }}
              />
            </InlineStack>
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    },
    [adminDetails_?.currency],
  );

  return (
    <Fragment>
      <VoucherDeleteAlert
        isUserAlertVisible={isUserAlertVisible}
        setIsUserAlertVisible={setIsUserAlertVisible}
        handleDelete={handleConfirmDelete}
        voucherId={voucherId}
        adminIdLocal={adminIdLocal}
        loading={loading}
      />
      <Page
        title="Voucher Management"
        primaryAction={{
          icon: PlusIcon,
          content: "Add Voucher",
          onAction: goToAddVoucher,
        }}
      >
        <Layout>
          <Layout.Section>
            <IndexTableList
              data={data}
              headings={headings}
              renderRow={renderVoucherRow}
              page={page}
              setPage={setPage}
              limit={limit}
              totalItems={totalItems}
              loading={adminDetailsLoading}
            />
          </Layout.Section>
        </Layout>
      </Page>
    </Fragment>
  );
}

export default VoucherTable;
